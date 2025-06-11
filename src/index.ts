#!/usr/bin/env node

// Импортируем McpServer из правильного места
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { performance } from 'perf_hooks';

// --- Configuration ---
const ENV_MAX_DURATION = "MCP_WAIT_MAX_DURATION_SECONDS";
const ENV_TOOL_DESCRIPTION = "MCP_WAIT_TOOL_DESCRIPTION";
// Убрали ENV_SEND_PROGRESS

const DEFAULT_MAX_DURATION = 210.0;
const DEFAULT_TOOL_DESCRIPTION = "Waits for a specified number of seconds. Use this to create a delay after starting a long-running operation (like a script or download via another tool), allowing it time to complete before you proceed or check its status.";
// Убрали DEFAULT_SEND_PROGRESS и PROGRESS_REPORT_INTERVAL

// --- Logging Function (to stderr) ---
function log(level: 'info' | 'warning' | 'error' | 'debug', message: string) {
    const timestamp = new Date().toISOString();
    console.error(`${timestamp} - ${level.toUpperCase()} - ${message}`);
}

// --- Read Configuration from Environment Variables ---
let MAX_SINGLE_WAIT = DEFAULT_MAX_DURATION;
const maxDurationStr = process.env[ENV_MAX_DURATION];
if (maxDurationStr) {
    const parsedDuration = parseFloat(maxDurationStr);
    if (!isNaN(parsedDuration)) {
        MAX_SINGLE_WAIT = parsedDuration;
        log('info', `Using max duration per call from env ${ENV_MAX_DURATION}: ${MAX_SINGLE_WAIT.toFixed(0)} seconds.`);
    } else {
        log('warning', `Invalid value in ${ENV_MAX_DURATION} ('${maxDurationStr}'). Using default: ${DEFAULT_MAX_DURATION.toFixed(0)} seconds.`);
    }
} else {
    log('info', `Env var ${ENV_MAX_DURATION} not set. Using default max duration per call: ${DEFAULT_MAX_DURATION.toFixed(0)} seconds.`);
}

MAX_SINGLE_WAIT = Math.max(1.0, MAX_SINGLE_WAIT);
log('info', `Effective max duration per call: ${MAX_SINGLE_WAIT.toFixed(0)} seconds.`);

// Read tool description from environment variable
let TOOL_DESCRIPTION = DEFAULT_TOOL_DESCRIPTION;
const toolDescriptionEnv = process.env[ENV_TOOL_DESCRIPTION];
if (toolDescriptionEnv) {
    TOOL_DESCRIPTION = toolDescriptionEnv;
    log('info', `Using custom tool description from env ${ENV_TOOL_DESCRIPTION}.`);
} else {
    log('info', `Env var ${ENV_TOOL_DESCRIPTION} not set. Using default tool description.`);
}

// --- Initialize MCP Server ---
const server = new McpServer({
    name: "wait_server",
    version: "1.0.0",
});

// --- Define the 'wait' tool schema using Zod ---
const waitInputSchema = z.object({
    duration_seconds: z.number().describe("The number of seconds to wait."),
});

// Асинхронная функция ожидания
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

// Определяем тип возвращаемого значения явно
type WaitToolResult = {
    content: { type: "text"; text: string }[];
    isError?: boolean; // isError необязателен для успеха
};

// Регистрируем инструмент
server.tool(
    "wait",
    TOOL_DESCRIPTION,
    waitInputSchema.shape,
    // Указываем тип возврата Promise<WaitToolResult>
    async (args: z.infer<typeof waitInputSchema>): Promise<WaitToolResult> => {
        const requestedDuration = args.duration_seconds;
        let remainingTimeAfterThisCall = 0.0;
        let isFinalWait = true;

        if (requestedDuration < 0) {
            log('warning', `Requested negative wait time ${requestedDuration.toFixed(0)} sec.`);
            return {
                content: [{ type: "text", text: `Error: Requested duration (${requestedDuration.toFixed(0)} seconds) cannot be negative.` }],
                isError: true // Теперь соответствует типу WaitToolResult
            };
        }

        let actualWaitTime: number;
        if (requestedDuration > MAX_SINGLE_WAIT) {
            actualWaitTime = MAX_SINGLE_WAIT;
            remainingTimeAfterThisCall = requestedDuration - MAX_SINGLE_WAIT;
            isFinalWait = false;
            log('info', `Request for ${requestedDuration.toFixed(0)}s exceeds single call limit of ${MAX_SINGLE_WAIT.toFixed(0)}s. Waiting for ${actualWaitTime.toFixed(0)}s now.`);
        } else {
            actualWaitTime = requestedDuration;
            log('info', `Starting wait for ${actualWaitTime.toFixed(0)} seconds...`);
        }

        // --- Упрощенное ожидание ---
        const actualWaitMs = actualWaitTime * 1000;
        try {
            await sleep(actualWaitMs); // Просто ждем нужное время
        } catch (error) {
            // Обработка, если sleep вдруг выбросит ошибку (маловероятно)
            log('warning', `Wait task failed or was cancelled.`);
            throw error;
        }
        // --- Конец ожидания ---

        log('info', `--- Wait interval of ${actualWaitTime.toFixed(0)} seconds FINISHED. ---`);

        let resultText: string;
        if (isFinalWait) {
            log('info', `Total requested duration (${requestedDuration.toFixed(0)}s) completed successfully.`);
            resultText = `Successfully waited for ${actualWaitTime.toFixed(0)} seconds.`;
        } else {
            log('info', `Instructing model to wait for remaining ${remainingTimeAfterThisCall.toFixed(0)} seconds.`);
            resultText = `Waited for ${actualWaitTime.toFixed(0)} seconds. IMPORTANT: Don't do your own math, just call the wait tool again for the remaining ${remainingTimeAfterThisCall.toFixed(0)} seconds. It will allow to finish task without errors`;
        }

        // Успешный результат соответствует WaitToolResult (isError не указан, значит false)
        return { content: [{ type: "text", text: resultText }] };
    }
);

// --- Define the 'get_datetime' tool ---
// Define the result type for the get_datetime tool
type GetDateTimeToolResult = {
    content: { type: "text"; text: string }[];
};

// Register the 'get_datetime' tool
server.tool(
    "get_datetime",
    "Returns the current date and time in ISO 8601 format (e.g., 2025-06-11T17:12:50.455Z).",
    z.object({}).shape, // No input parameters
    async (): Promise<GetDateTimeToolResult> => {
        const currentDatetime = new Date().toISOString();
        log('info', `Tool 'get_datetime' called. Returning: ${currentDatetime}`);
        return {
            content: [{ type: "text", text: currentDatetime }]
        };
    }
);

// --- Start the Server ---
async function main() {
    log('info', "Initializing StdioServerTransport...");
    const transport = new StdioServerTransport();
    try {
        log('info', "Connecting server to transport...");
        await server.connect(transport);
        log('info', "MCP Wait Server (Node.js) running on stdio. Waiting for requests...");

        await new Promise<void>((resolve) => {
            const shutdown = () => {
                log('info', "Shutting down...");
                resolve();
            };
            process.on('SIGINT', shutdown);
            process.on('SIGTERM', shutdown);
        });

        log('info', "Server shutdown complete.");

    } catch (error) {
        log('error', `Fatal error during server startup or execution: ${error instanceof Error ? error.message : String(error)}`);
        if (error instanceof Error && error.stack) {
            log('error', error.stack);
        }
        process.exit(1);
    }
}

main();