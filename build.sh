#!/bin/sh
cd "$(dirname "$0")"
{ cat head.html; cat js/*.js; printf '\n</script>\n</body></html>\n'; } > index.html
