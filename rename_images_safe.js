const fs = require('fs');
const path = require('path');

const dir = 'public/images/cards';

fs.readdir(dir, (err, files) => {
  if (err) throw err;

  files.forEach(file => {
    const oldPath = path.join(dir, file);
    const tempPath = path.join(dir, `temp_${file}`);
    const newPath = path.join(dir, file.toLowerCase());

    if (file !== file.toLowerCase()) {
      // Rename to temp first to force FS update
      fs.renameSync(oldPath, tempPath);
      fs.renameSync(tempPath, newPath);
      console.log(`Renamed: ${file} -> ${file.toLowerCase()}`);
    }
  });
  console.log('Checked all files.');
});
