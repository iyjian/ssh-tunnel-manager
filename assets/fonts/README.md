# Local UI Font

To lock UI typography across macOS and Windows, place your font files in this folder.

## Supported file names

Use either `.woff2` or `.ttf` (or both):

- `app-ui-regular.woff2` / `app-ui-regular.ttf`  (weight 400)
- `app-ui-medium.woff2` / `app-ui-medium.ttf`    (weight 500)
- `app-ui-semibold.woff2` / `app-ui-semibold.ttf` (weight 600)

The app CSS already loads these files via `@font-face`.

## Notes

- `woff2` is recommended for smaller package size.
- Keep proper font licensing before committing to a public repository.
- If files are missing, the app falls back to system fonts.
