# Christ in Pity — scene comparison

Loads HSH / PTM / RBF / RILSR / Neural encodings of the same capture through
`SceneSession` / `SceneProjection`, stacked with identity transforms.

## Dataset (not in git)

The example expects:

```text
frontend/openlime/dist/assets/ChristInPity/
  t01-hsh27/
  t01-ptm18/
  t01-rbf18/
  rilsr/
  nrti/
  readme.txt
```

Copy the package from your data store, or symlink it, e.g.:

```bash
cd frontend/openlime/dist/assets
ln -s /path/to/ChristInPity ChristInPity
```

The directory is large (>1 GB) and is gitignored.

## Run

```bash
cd frontend/openlime
npm run build   # or: npm run rollup
npm run dev
# open http://localhost:8080/examples/scene-christ-in-pity/
```

## Note on Neural RTI

`nrti/info.json` in this export is training metadata (`minimum`/`maximum`,
checkpoints). Classic OpenLIME `LayerNeuralRTI` expects a config with
`weights` / `biases` / `samples` / `planes`.

Template of the expected JSON (plus plane naming notes):
[`neural-openlime.template.json`](./neural-openlime.template.json).

Fill `weights`/`biases` from `model_state.pt` / `checkpoints/best.ckpt`, point the
scene source at that file, and expose coefficient JPEGs as `plane_1`…`plane_3`
(not `plane_0`…`plane_2`). Until then, prefer HSH / PTM / RBF / RILSR.
