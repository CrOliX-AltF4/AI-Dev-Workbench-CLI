// TODO: Step 3 — read/write provider API keys and settings

export function configCommand(action: string, key: string, value?: string): void {
  console.log(
    `Config [${action}] ${key}${value ? ` = ${value}` : ''} — coming in step 3 (providers)`,
  );
}
