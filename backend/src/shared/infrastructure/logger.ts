import type { ILogger } from "@/shared/domain/ILogger";
import { ConsoleLogger } from "./ConsoleLogger";

export const logger: ILogger = new ConsoleLogger();
