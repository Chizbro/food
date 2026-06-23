// Owner-only publish: commits data.json to the repo via the GitHub API.
// Public reads the static data.json directly; only a request carrying EDIT_TOKEN can write.
// Env vars (set in Netlify, never shipped to the browser):
//   EDIT_TOKEN  — the password you type in research mode
//   GH_TOKEN    — a GitHub fine-grained token with Contents: read+write on this repo
//   GH_REPO     — "your-user/your-repo"
//   GH_BRANCH   — optional, defaults to "main"
const API = 'https://api.github.com';

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (req.headers.get('authorization') !== `Bearer ${process.env.EDIT_TOKEN}`)
    return new Response('Unauthorized', { status: 401 });

  let data;
  try { data = await req.json(); } catch { return new Response('Bad JSON', { status: 400 }); }
  if (!data || typeof data !== 'object' || Array.isArray(data))
    return new Response('Expected a JSON object', { status: 400 });

  const branch = process.env.GH_BRANCH || 'main';
  const url = `${API}/repos/${process.env.GH_REPO}/contents/data.json`;
  const gh = {
    Authorization: `Bearer ${process.env.GH_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'eating-the-world',
  };

  // GitHub needs the current file's SHA to replace it.
  const cur = await fetch(`${url}?ref=${branch}`, { headers: gh });
  const sha = cur.ok ? (await cur.json()).sha : undefined;

  const content = Buffer.from(JSON.stringify(data, null, 2) + '\n').toString('base64');
  const res = await fetch(url, {
    method: 'PUT', headers: gh,
    body: JSON.stringify({ message: 'Update data.json', content, sha, branch }),
  });
  return res.ok
    ? new Response('Published', { status: 200 })
    : new Response('GitHub error: ' + (await res.text()), { status: 502 });
};
