const fs = require('fs');

let code = fs.readFileSync('scripts/generate_complete_sql_files.js', 'utf8');

// 1. Add categories 10 and 11
code = code.replace(
  "(8, 'housing', 'السكن', 'fa-bed', 8),\n(9, 'bus', 'مواصلات', 'fa-bus', 9)",
  "(8, 'housing', 'السكن', 'fa-bed', 8),\n(9, 'bus', 'مواصلات', 'fa-bus', 9),\n(10, 'clothes', 'الملابس', 'fa-shirt', 10),\n(11, 'hotels', 'الفنادق والأوتيلات', 'fa-hotel', 11)"
);

// 2. Add to catCodeToId
code = code.replace(
  "    housing: 8,\n    bus: 9,\n  };",
  "    housing: 8,\n    bus: 9,\n    clothes: 10,\n    hotels: 11,\n  };"
);

// 3. Update user favorites mock insert to use valid place UUIDs from placesData
code = code.replace(
  "('00000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001'),\n('00000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000003'),\n('00000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001'),\n('a9ed234a-7b67-4f19-b2f9-c6296d4c7c46', '20000000-0000-0000-0000-000000000001')",
  "`('00000000-0000-0000-0000-000000000004', '${placesData[0].id}'),\n('00000000-0000-0000-0000-000000000004', '${placesData[1].id}'),\n('00000000-0000-0000-0000-000000000002', '${placesData[0].id}'),\n('a9ed234a-7b67-4f19-b2f9-c6296d4c7c46', '${placesData[0].id}')`"
);

fs.writeFileSync('scripts/generate_complete_sql_files.js', code, 'utf8');
console.log('Successfully updated generate_complete_sql_files.js');
