import { config } from "dotenv";
import { streamText } from "ai";

config({ path: ".env.local" });

async function main() {
  const result = streamText({
    model: "openai/gpt-5.4",
    prompt: "Write a short haiku about connection networks.",
  });

  for await (const chunk of result.textStream) {
    process.stdout.write(chunk);
  }
  process.stdout.write("\n");

  const usage = await result.usage;
  console.log("Token usage:", usage);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
