import { execFile } from "child_process";
import { promisify } from "util";

export const execFileAsync = promisify(execFile);

export const FFMPEG = process.env.FFMPEG_PATH || "/opt/homebrew/bin/ffmpeg";
export const FFPROBE = process.env.FFPROBE_PATH || "/opt/homebrew/bin/ffprobe";
