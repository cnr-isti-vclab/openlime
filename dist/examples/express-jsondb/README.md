# OpenLIME Annotation Server

This repository contains a minimal Node.js Express server that serves SVG annotations in JSON format, loaded from a static file (`anno.json`).

## Installation

To install the required dependencies, run:

```bash
npm install
```

## Running the Server

To start the server:

```bash
npm run server
```

The server will be accessible at:

```
http://localhost:3000/annotations
```

## Features

* Exposes a single REST route:

  ```
  GET /annotations
  ```

  Returns all annotations from the `anno.json` file that are marked with `"publish": 1`.

* The `anno.json` file acts as a local "database" and contains SVG annotations, each with:

  * `id`, `label`, `description`, `class`, `svg`
  * Optionally: `data` and `idx`

* The `openlimedb.js` module handles loading and filtering published annotations.

## Project Structure

* `server.js` — Express server exposing the `/annotations` API
* `openlimedb.js` — Module that loads and filters `anno.json`
* `anno.json` — Annotation data store

## Notes

* No SQL database is required.
* Designed for local testing or as a backend for clients such as [OpenLIME](https://github.com/CRS4/openlime).

