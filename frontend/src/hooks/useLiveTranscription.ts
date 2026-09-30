import { useCallback, useEffect, useRef, useState } from "react";
import { StreamMessage, streamUrl } from "../api/client";
import { MicCapture, startMicCapture } from "../lib/audio";

export type MicStatus = "idle" | "starting" | "connecting" | "listening" | "reconnecting";

const MAX_RECONNECTS = 3;
const MAX_BUFFERED_CHUNKS = 50; // ~5 s of audio held while reconnecting

interface Turn {
  text: string;
  final: boolean;
}

function join(...parts: string[]): string {
  return parts.map((part) => part.trim()).filter(Boolean).join(" ");
}

/**
 * Streams mic audio to the backend and builds a live transcript.
 *
 * Turns are keyed by AssemblyAI's turn_order so the formatted copy of a turn
 * replaces the raw one instead of being appended. If the socket drops
 * mid-capture, the mic keeps running, audio is buffered, and the socket is
 * reopened with backoff. Words already heard are committed first so a
 * reconnect never loses them.
 */
export function useLiveTranscription() {
  const [status, setStatus] = useState<MicStatus>("idle");
  const [committed, setCommitted] = useState("");
  const [turns, setTurns] = useState<Map<number, Turn>>(new Map());
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const micRef = useRef<MicCapture | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const bufferRef = useRef<ArrayBuffer[]>([]);
  const attemptsRef = useRef(0);
  const stoppingRef = useRef(false);
  const reconnectTimerRef = useRef<number | null>(null);
  const fallbackTurnRef = useRef(0);
  const turnsRef = useRef(turns);
  turnsRef.current = turns;

  const turnText = useCallback((map: Map<number, Turn>, finalOnly: boolean) => {
    return join(
      ...[...map.entries()]
        .sort(([a], [b]) => a - b)
        .filter(([, turn]) => !finalOnly || turn.final)
        .map(([, turn]) => turn.text)
    );
  }, []);

  /** Fold every turn heard so far (including partials) into the committed text. */
  const commitTurns = useCallback(() => {
    const heard = turnText(turnsRef.current, false);
    turnsRef.current = new Map();
    setTurns(new Map());
    fallbackTurnRef.current = 0;
    if (heard) setCommitted((previous) => join(previous, heard));
  }, [turnText]);

  const teardown = useCallback(() => {
    stoppingRef.current = true;
    if (reconnectTimerRef.current !== null) window.clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = null;
    micRef.current?.stop();
    micRef.current = null;
    const socket = socketRef.current;
    socketRef.current = null;
    if (socket && socket.readyState <= WebSocket.OPEN) socket.close();
    bufferRef.current = [];
    commitTurns();
    setStatus("idle");
  }, [commitTurns]);

  const openSocket = useCallback(() => {
    const socket = new WebSocket(streamUrl());
    socket.binaryType = "arraybuffer";
    socketRef.current = socket;
    let fatal = false;

    socket.onmessage = (event) => {
      let data: StreamMessage;
      try {
        data = JSON.parse(event.data as string) as StreamMessage;
      } catch {
        return;
      }

      if (data.type === "ready") {
        attemptsRef.current = 0;
        setError(null);
        setStatus("listening");
        bufferRef.current.forEach((chunk) => socket.send(chunk));
        bufferRef.current = [];
        return;
      }

      if (data.type === "transcript") {
        const key = data.turnOrder ?? fallbackTurnRef.current;
        if (data.turnOrder === undefined && data.final) fallbackTurnRef.current += 1;
        setTurns((previous) => {
          const existing = previous.get(key);
          // Don't let a late partial overwrite a turn that already finished.
          if (existing?.final && !data.final) return previous;
          const next = new Map(previous);
          next.set(key, { text: data.text, final: data.final });
          turnsRef.current = next;
          return next;
        });
        return;
      }

      if (data.type === "error") {
        fatal = true;
        setError(data.message);
      }
    };

    socket.onclose = () => {
      if (socketRef.current !== socket || stoppingRef.current) return;
      socketRef.current = null;

      if (fatal || attemptsRef.current >= MAX_RECONNECTS) {
        setError((previous) => previous ?? "Lost the live transcription connection. Your transcript so far is saved.");
        teardown();
        return;
      }

      commitTurns();
      attemptsRef.current += 1;
      setStatus("reconnecting");
      const delay = 1000 * 2 ** (attemptsRef.current - 1);
      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectTimerRef.current = null;
        if (!stoppingRef.current) openSocket();
      }, delay);
    };
  }, [commitTurns, teardown]);

  const start = useCallback(async () => {
    if (micRef.current || status !== "idle") return;
    stoppingRef.current = false;
    attemptsRef.current = 0;
    setError(null);
    setStatus("starting");

    try {
      micRef.current = await startMicCapture((chunk) => {
        const socket = socketRef.current;
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(chunk);
        } else {
          bufferRef.current.push(chunk);
          if (bufferRef.current.length > MAX_BUFFERED_CHUNKS) bufferRef.current.shift();
        }
      }, setLevel);
    } catch (err) {
      const denied = err instanceof DOMException && err.name === "NotAllowedError";
      setError(denied ? "Microphone access was blocked. Allow it in your browser's site settings." : "Couldn't start the microphone.");
      setStatus("idle");
      return;
    }

    if (stoppingRef.current) {
      // stop() was pressed while the permission prompt was open.
      micRef.current?.stop();
      micRef.current = null;
      return;
    }

    setStatus("connecting");
    openSocket();
  }, [openSocket, status]);

  const stop = useCallback(() => teardown(), [teardown]);

  const setTranscript = useCallback((text: string) => {
    turnsRef.current = new Map();
    setTurns(new Map());
    setCommitted(text);
  }, []);

  useEffect(() => () => teardown(), [teardown]);

  // Pass committed text through untouched when nothing is streaming, so
  // typing in the textarea doesn't have trailing spaces trimmed away.
  const heardFinal = turnText(turns, true);
  const finalText = heardFinal ? join(committed, heardFinal) : committed;
  const partial = [...turns.values()].filter((turn) => !turn.final).map((turn) => turn.text).join(" ");

  return {
    status,
    isActive: status !== "idle",
    transcript: finalText,
    partial,
    level,
    error,
    clearError: () => setError(null),
    setTranscript,
    start,
    stop,
  };
}
