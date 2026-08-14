const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target = `    } catch (err: any) {
      console.error("Error in /api/meetings/update:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to update meeting.",
        error: err.message || "Server error"
      });
    }`;

const rep = `    } catch (err: any) {
      console.error("Error in /api/meetings/update:", err);
      return res.status(500).json({
        success: false,
        message: "Backend Crash: " + (err.stack || err.message || "Unknown error"),
        error: err.message || "Server error"
      });
    }`;

if (code.includes(target)) {
  code = code.replace(target, rep);
  fs.writeFileSync('server.ts', code);
  console.log('patched');
} else {
  console.log('not found');
}
