<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Troubleshooting & Restart Checklist
If the application is not retrieving data from the database (especially after a server or system restart), follow this checklist:
1. **Kill Stale Processes First**: Detect and stop any orphaned Next.js servers listening on port 3000.
   - Windows PowerShell: `Stop-Process -Id <PID> -Force` (Find PID via `netstat -ano | findstr 3000`)
   - Cross-platform: `npx kill-port 3000` or `cmd /c "npx kill-port 3000"`
2. **Check Environment Variables**: Ensure `.env` is loaded. Pay close attention to `DATABASE_URL` and Supabase keys.
3. **Clean Restart**: Start the development server fresh via `cmd.exe /c "npm run dev"` to load all environment variables and initialize a clean database connection pool.

