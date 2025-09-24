# Contributing

## Localisation

There are json files in `src/lib/translations` for each language. You can add a new language by creating a new file, and adding it to the `src/lib/translations/index.ts` file.

In the svelte page/components, make sure to call `useI18n()` once at top level to set the correct locale for SSR (which can have parallel requests in different locales).

Install the i18n-ally extension for VSCode, which will help you with the translations, including finding missing translations.

## Testing

Adding unit tests is always welcome. You can run an individual test this way

```console
pnpm test:unit -t "<part of test name>"
```
