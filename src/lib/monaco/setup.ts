import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";

// Use the bundled monaco-editor instead of the default CDN loader.
// Avoids indefinite "Loading..." when CDN is blocked or loader/editor versions mismatch.
loader.config({ monaco });
