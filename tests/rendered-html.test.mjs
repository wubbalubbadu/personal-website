import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const { default: worker } = await import("../dist/server/index.js");
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("portfolio serves meaningful HTML before JavaScript loads", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.match(html, /Haylie Wu/);
  assert.match(html, /software developer/i);
  assert.match(html, /<noscript>/);
  assert.match(html, /haylie-wu-resume\.pdf/);
  assert.match(html, /mailto:hayliewu0709@gmail\.com/);
  assert.match(html, /github\.com\/wubbalubbadu/);

  assert.doesNotMatch(
    html,
    /Building your site|Your site is taking shape|courtyard\.jpg/,
  );
});
