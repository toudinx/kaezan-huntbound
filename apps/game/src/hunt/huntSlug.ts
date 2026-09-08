/**
 * The kebab-case tail of a hunt key, which is how the generated hunt
 * definitions are laid out on disk.
 *
 * This module used to also resolve a character sheet from the hunt --
 * `character:huntbound:<vocation>-<hunt>`, one authored sheet per hunting
 * place. PB-13-03 replaced that with the persistent character, so choosing a
 * hunt now chooses a place and nothing else.
 */
export function huntSlug(huntId: string): string {
  const slug = huntId.split(':').at(-1) ?? huntId;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(`Hunt key does not end in a kebab-case slug: ${huntId}`);
  }
  return slug;
}
