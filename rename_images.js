const fs = require('fs');
const path = require('path');

const dir = 'public/images/cards';

fs.readdir(dir, (err, files) => {
  if (err) throw err;

  files.forEach(file => {
    const oldPath = path.join(dir, file);
    const newPath = path.join(dir, file.toLowerCase());

    if (oldPath !== newPath) {
      fs.renameSync(oldPath, newPath);
      console.log(`Renamed: ${file} -> ${file.toLowerCase()}`);
    }
  });
  console.log('Done ensuring lowercase.');
});
