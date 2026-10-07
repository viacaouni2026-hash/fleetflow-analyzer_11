// Netlify Serverless Function to proxy spreadsheet/file requests bypassing browser CORS
export default async (req: Request) => {
  // Support CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Cache-Control, Pragma, Authorization",
        "Access-Control-Max-Age": "86400"
      }
    });
  }

  const url = new URL(req.url);
  const targetUrl = url.searchParams.get("url");

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: "Parâmetro 'url' é obrigatório." }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }

  try {
    const fetchResponse = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/csv, application/json, text/plain, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, */*"
      }
    });

    if (!fetchResponse.ok) {
      return new Response(JSON.stringify({ error: `Falha remota: ${fetchResponse.status} ${fetchResponse.statusText}` }), {
        status: fetchResponse.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    const contentType = fetchResponse.headers.get("content-type") || "text/csv; charset=utf-8";
    const body = await fetchResponse.arrayBuffer();

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Expose-Headers": "Content-Type, Content-Length",
        "Cache-Control": "no-store, no-cache, must-revalidate"
      }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: `Erro no proxy: ${err.message || err}` }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
};
