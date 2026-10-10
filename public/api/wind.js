// This is a simple handler for Vercel/serverless - adjust for your deployment
export default async function handler(req, res) {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'URL parameter required' });
  }
  try {
    const response = await fetch(url);
    const csv = await response.text();
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Access-Control-Allow-Methods', '*');
    res.status(200).send(csv);
  } catch {
    res.status(500).json({ error: 'Failed to fetch wind data' });
  }
}