const fs = require('fs');
const path = require('path');

function removeBOM(dir) {
  let fixed = 0;
  fs.readdirSync(dir).forEach(f => {
    const fp = path.join(dir, f);
    const st = fs.statSync(fp);
    if (st.isDirectory()) {
      fixed += removeBOM(fp);
    } else if (/\.(jsx|js|css)$/.test(f)) {
      const buf = fs.readFileSync(fp);
      if (buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
        fs.writeFileSync(fp, buf.slice(3));
        console.log('Fixed:', fp);
        fixed++;
      }
    }
  });
  return fixed;
}

const target = path.join(__dirname, 'frontend', 'src');
const count = removeBOM(target);
console.log(`Total fixed: ${count}`);
