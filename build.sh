#!/bin/sh
cd "$(dirname "$0")"
{ awk '/<!--THREE-->/{print "<script>"; system("cat vendor/three.min.js"); print "</script>"; next} {print}' head.html; cat js/*.js; printf '\n</script>\n</body></html>\n'; } > index.html
