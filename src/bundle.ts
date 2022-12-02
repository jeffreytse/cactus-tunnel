// import all modules for bundle

import url from "url";
import { createBridge } from "./bridge";

const result = url.parse(window.location.href, true);
const localPort = parseInt(result.port || "0") + 1;
const localUrl: string =
  (result?.query?.localUrl as string) || `localhost:${localPort}`;

createBridge(`ws://${localUrl}`);
