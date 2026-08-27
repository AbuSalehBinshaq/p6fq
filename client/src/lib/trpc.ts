import { createTRPCReact } from "@trpc/react-query";
import type { RenderRouter } from "../../../server/renderRouter";

export const trpc = createTRPCReact<RenderRouter>();
