export type ShellCommand = {
  id: string;
  appKey: string;
  label: string;
  keywords?: string;
  /** Display string for the ? cheat sheet, e.g. "q" or "⌘K". */
  shortcut?: string;
  run: () => void;
};

export type ShortcutEntry = {
  id: string;
  appKey: string;
  label: string;
  shortcut: string;
};

type CommandProvider = () => ShellCommand[];

const providers = new Map<string, CommandProvider>();

export function registerAppCommands(appKey: string, provider: CommandProvider) {
  providers.set(appKey, provider);
  return () => {
    if (providers.get(appKey) === provider) providers.delete(appKey);
  };
}

export function listRegisteredCommands(installedAppKeys: string[]) {
  const installed = new Set(installedAppKeys);
  const commands: ShellCommand[] = [];
  for (const [appKey, provider] of providers) {
    if (!installed.has(appKey)) continue;
    commands.push(...provider());
  }
  return commands;
}

export function listRegisteredShortcuts(installedAppKeys: string[]): ShortcutEntry[] {
  return listRegisteredCommands(installedAppKeys)
    .filter((command): command is ShellCommand & { shortcut: string } => Boolean(command.shortcut))
    .map((command) => ({
      id: command.id,
      appKey: command.appKey,
      label: command.label,
      shortcut: command.shortcut,
    }));
}
