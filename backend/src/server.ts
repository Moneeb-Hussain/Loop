import "dotenv/config";
import http from "http";
import app from "./app.js";
import { attachStreamingTranscription } from "./services/streamingTranscription.js";

const server = http.createServer(app);
attachStreamingTranscription(server);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Loop backend listening on port ${PORT}`);
});
