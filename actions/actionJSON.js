const fs = require("fs");

// Read the JSON file
function saveLpAddress(newData) {
  const filepath = "./lpData.json";
  // if (fs.existsSync(filepath)) {
  //   const fileContent = fs.readFileSync(filepath, "utf8");
  //   if (fileContent.trim().length > 0) {
  //     jsonData = JSON.parse(fileContent);
  //   } else {
  //     jsonData = [];
  //   }
  // } else {
  //   fs.writeFileSync(filepath, "");
  //   jsonData = [];
  //   console.log("JSON file created successfully!");
  // }

  // newData.some((newitem) => {
  //   const dataExists = jsonData.some(
  //     (item) => item.pool_address === newitem.pool_address
  //   );
  //   if (!dataExists) {
  //     jsonData.push(newitem);
  //   }
  // });

  const updatedJsonData = JSON.stringify(newData);

  fs.writeFile(filepath, updatedJsonData, "utf8", (err) => {
    if (err) {
      console.error("Error writing Lp address JSON file:", err);
    } else {
      console.log("New LP Address has been written to the JSON file.");
      console.log("...Starting to get wallet address");
    }
  });

  return newData;
}

function saveWalletsAddress(newData) {
  const filepath = "./walletData.json";
  const trackFilePath = '../tracker/log/watched_wallets.txt'
  // if (fs.existsSync(filepath)) {
  //   const fileContent = fs.readFileSync(filepath, "utf8");
  //   if (fileContent.trim().length > 0) {
  //     jsonData = JSON.parse(fileContent);
  //   } else {
  //     jsonData = [];
  //   }
  // } else {
  //   fs.writeFileSync(filepath, "");
  //   jsonData = [];
  //   console.log("JSON file created successfully!");
  // }

  // newData.some((newitem) => {
  //   const dataExists = jsonData.some(
  //     (item) => item.address === newitem.address
  //   );
  //   if (!dataExists) {
  //     jsonData.push(newitem);
  //   }
  // });

  console.log("saving json wallet json data.")

  const updatedJsonData = JSON.stringify(newData);

  fs.writeFile(filepath, updatedJsonData, "utf8", (err) => {
    if (err) {
      console.error("Error writing Lp address JSON file:", err);
    } else {
      console.log("Wallet Address has been written to the JSON file.");
    }
  });

  fs.writeFile(trackFilePath, updatedJsonData, "utf8", (err) => {
    if (err) {
      console.error("Error writing Lp address JSON file:", err);
    } else {
      console.log("Wallet Address has been written to the JSON file.");
    }
  });
}

module.exports = {
  saveLpAddress,
  saveWalletsAddress,
};
