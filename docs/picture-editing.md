# Selected-picture editing: source handoff and writeback

The 0.9.3 adapter separates a cached picture identity from an image file that this plugin can read. The previous guard required a nonempty external `picturePath` plus a complete rectangle; missing picture details were incorrectly reported as “select exactly one image.” Even with valid metadata, the old source loader stopped when the original path no longer existed or could not be read.

## Source preparation

1. Read the current lasso once. Continue only for exactly one picture element (`type=200`) with a cached `uuid`. A truly empty or mixed selection is rejected and now includes the returned element count/types in the error. No image or page index is guessed.
2. Reuse a valid, readable original PNG/JPEG at its original resolution. Pass the measured dimensions forward so the controller does not call the bridge to inspect it again.
3. If the original is missing, private, relative, or undecodable, call the official `generateLassoPreview(imagePath)` with a unique PNG destination under this plugin's private `editor-cache`. This asks the host to render the sole selected picture instead of treating the original backing path as a public file or trying to bypass storage restrictions. Request normal file-write permission when the host needs to export.
4. Reuse valid original picture bounds. Only when bounds are absent, use the rectangle supplied by the host's preview result. Keep the incoming cache ID, accessors, numbering, original layer, and other metadata. If the original pixels cannot be read and the exported selection reports a nonzero rotation, stop with a specific limitation instead of applying an existing transform to already transformed pixels a second time.
5. Keep the private source alive throughout the editing session; remove only that session's temporary file after writeback or cancellation. Failed exports also clean their own temporary output. Shared original or edited-output images are never deleted by session cleanup.

The export is a rendered lasso preview, so if the original file has become unavailable, it may contain fewer pixels than that original. It is used only after verifying that the lasso contains one picture; strokes, templates, mixed selections, and whole-page screenshots are never substituted.

## Writeback

Only the selected picture is submitted through `PluginCommAPI.modifyPageElements([element], page, originalLayer)`, which is the documented current-open-file operation. Its response is the list of successfully modified element indices, not a Boolean. The existing controller still checks that the file and current page match the captured context immediately before mutation. No whole-page matching, element refetch, delete/reinsert, or page rebuilding occurs.

The replacement retains the original `uuid` and all unrelated fields. The output path and aspect-fitted picture rectangle change; `pageNum` is set to the confirmed zero-based target page. After successful single-element modification, save the current note, then close the plugin and release its cached element/source. Ambiguous mutations are never automatically retried.

## 0.9.4: negative page metadata

The device reported `modifyPageElements.elements[0].pageNum must be >= 0` (107). The shipped SDK's actual ElementSchema validates pageNum independently of the method's page argument. A lasso snapshot can contain a negative sentinel, so preserving that field caused rejection before the native host was invoked. Writeback now explicitly sets the outgoing element's pageNum to the captured target page after the existing context check. It does not mutate the incoming cached object or change its uuid, accessors, layer or in-page number.

`tests/sdk-writeback.test.cjs` loads the real 0.2.3 SDK validator rather than copying its rules: it reproduces rejection of pageNum=-1, then checks that replacement of snapshots with negative, absent or stale page metadata reaches the simulated native call with the confirmed page. Actual host persistence still requires device testing.

## 0.9.6: leave the post-replacement selection to the host

Device testing confirmed that the 0.9.5 post-handoff lasso recovery still did not retain the selection. It is removed in 0.9.6, including the page-size query, lasso readback/rebuild, box-state changes, fallback verification, extra cache handling and recovery toast. Replacement still modifies only the captured picture, confirms the result, saves, closes the plugin, then releases its own cached element and temporary source. No selection API is called after writeback. Use the system lasso again to move or resize the replacement.

The working new-image insertion handoff remains unchanged. Removing replacement-selection recovery does not remove lasso image editing or replacement.

## Verification and limits

Regression tests exercise complete and incomplete host picture payloads, missing/relative/private backing paths, direct-source reuse, preview rejection, invalid output paths/bounds, nonzero rotation, original-layer writeback, original cache/accessor retention, temporary-file lifetime, and no mutation on failure. These are desktop bridge simulations; only device testing can confirm a particular firmware's returned picture data and rendered preview behavior. If the host returns zero elements or omits the cached picture ID, the plugin cannot safely identify an original to replace and reports that actual condition.

Official references checked 2026-10-26:

- [Lasso workflow](https://docs.supernote.com/en/plugin-base/lasso)
- [Element types and picture metadata](https://docs.supernote.com/en/api-reference/supernote-plugin/types/trail)
- [Picture data](https://docs.supernote.com/en/api-reference/supernote-plugin/types/picture)
- [System lasso-preview export](https://docs.supernote.com/en/api-reference/supernote-plugin/plugin-comm-api/generate-lasso-preview)
- [Current-page element modification](https://docs.supernote.com/en/api-reference/supernote-plugin/plugin-comm-api/modify-page-elements)
- [Element caching and release](https://docs.supernote.com/en/plugin-base/file-op/element-op)

`editDataTypes: [2]` is the button-registration category for images, while `Element.type=200` is the element data category. They are separate enumerations, as shown in SDK `PluginButton.ts` and `Element.ts`; the current official Element table also explicitly maps Picture to 200. The installed 0.2.3 SDK retains an old “currently unused” comment beside one picture constant, but does expose the Picture structure and its native bridge. The public docs do not specify a minimum firmware release for every picture readback behavior; a library update alone cannot guarantee support in older host firmware.
