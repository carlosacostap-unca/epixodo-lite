# mcp-pocketbase-epixodo-lite

Servidor MCP local para trabajar con la base de datos PocketBase de Epixodo Lite desde Codex.

## Variables

El servidor carga automaticamente `../../.env.local` desde la raiz del proyecto. Usa estas variables:

- `POCKETBASE_URL` o `NEXT_PUBLIC_POCKETBASE_URL`
- `POCKETBASE_ADMIN_EMAIL`
- `POCKETBASE_ADMIN_PASSWORD`
- opcionalmente `POCKETBASE_ADMIN_TOKEN`

## Herramientas

- `health`
- `whoami`
- `list_collections`
- `get_collection`
- `list_records`
- `get_record`
- `create_record`
- `update_record`
- `delete_record`
- `create_collection`
- `update_collection`
- `delete_collection`
- `list_projects`
- `list_tasks`
- `validate_epixodo_schema`

## Configuracion Codex

Agregar en `~/.codex/config.toml`:

```toml
[mcp_servers.mcp-pocketbase-epixodo-lite]
command = "node"
args = ['C:\Proyectos\epixodo-lite\.codex\mcp-pocketbase-epixodo-lite\server.mjs']
enabled = true

[mcp_servers.mcp-pocketbase-epixodo-lite.tools.health]
approval_mode = "approve"

[mcp_servers.mcp-pocketbase-epixodo-lite.tools.whoami]
approval_mode = "approve"

[mcp_servers.mcp-pocketbase-epixodo-lite.tools.list_collections]
approval_mode = "approve"

[mcp_servers.mcp-pocketbase-epixodo-lite.tools.get_collection]
approval_mode = "approve"

[mcp_servers.mcp-pocketbase-epixodo-lite.tools.list_records]
approval_mode = "approve"

[mcp_servers.mcp-pocketbase-epixodo-lite.tools.get_record]
approval_mode = "approve"

[mcp_servers.mcp-pocketbase-epixodo-lite.tools.list_projects]
approval_mode = "approve"

[mcp_servers.mcp-pocketbase-epixodo-lite.tools.list_tasks]
approval_mode = "approve"

[mcp_servers.mcp-pocketbase-epixodo-lite.tools.validate_epixodo_schema]
approval_mode = "approve"

[mcp_servers.mcp-pocketbase-epixodo-lite.tools.create_record]
approval_mode = "approve"

[mcp_servers.mcp-pocketbase-epixodo-lite.tools.update_record]
approval_mode = "approve"

[mcp_servers.mcp-pocketbase-epixodo-lite.tools.delete_record]
approval_mode = "approve"

[mcp_servers.mcp-pocketbase-epixodo-lite.tools.create_collection]
approval_mode = "approve"

[mcp_servers.mcp-pocketbase-epixodo-lite.tools.update_collection]
approval_mode = "approve"

[mcp_servers.mcp-pocketbase-epixodo-lite.tools.delete_collection]
approval_mode = "approve"
```

Las variables sensibles quedan en `.env.local`; no hace falta duplicarlas en `config.toml`.
