const fs = require('fs');
const path = require('path');

const filePath = 'c:\\Users\\teragroup\\Desktop\\sales-crm-web\\src\\app\\clients\\ClientsClientPage.tsx';
let code = fs.readFileSync(filePath, 'utf8');

// 1. Add state variables
code = code.replace(
  /const \[editingContact, setEditingContact\] = useState<Contact \| null>\(null\);/g,
  `const [newCustomerStatus, setNewCustomerStatus] = useState('ลูกค้าใหม่');\n  const [editCustomerStatus, setEditCustomerStatus] = useState('ลูกค้าใหม่');\n\n  const [editingContact, setEditingContact] = useState<Contact | null>(null);`
);

// 2. Add to handleEditCompany
code = code.replace(
  /setEditCustomerType\(company\.customerType \|\| 'นิติบุคคล'\);/g,
  `setEditCustomerType(company.customerType || 'นิติบุคคล');\n    setEditCustomerStatus(company.customerStatus || 'ลูกค้าใหม่');`
);

// 3. Add helper variables before return
code = code.replace(
  /  const totalPages = Math\.ceil\(companiesCount \/ limit\);\n\n  return \(/g,
  `  const totalPages = Math.ceil(companiesCount / limit);\n\n  const isCreateAddressRequired = createCustomerType !== 'บุคคลธรรมดา' && newCustomerStatus !== 'ปิดกิจการ (Closed Business)';\n  const isCreateBusinessTypeRequired = newCustomerStatus !== 'ปิดกิจการ (Closed Business)';\n  const isCreateCustomerTypeRequired = newCustomerStatus !== 'ปิดกิจการ (Closed Business)';\n\n  const isEditAddressRequired = editCustomerType !== 'บุคคลธรรมดา' && editCustomerStatus !== 'ปิดกิจการ (Closed Business)';\n  const isEditBusinessTypeRequired = editCustomerStatus !== 'ปิดกิจการ (Closed Business)';\n  const isEditCustomerTypeRequired = editCustomerStatus !== 'ปิดกิจการ (Closed Business)';\n\n  return (`
);

// 4. Update Create Form Customer Type
code = code.replace(
  /<label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">ประเภทลูกค้า \(นิติบุคคล \/ บุคคลธรรมดา\) \*<\/label>\s*<select\s*name="customerType"\s*required/g,
  `<label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">ประเภทลูกค้า (นิติบุคคล / บุคคลธรรมดา) {isCreateCustomerTypeRequired && '*'}</label>\n                  <select \n                    name="customerType" \n                    required={isCreateCustomerTypeRequired}`
);

// 5. Update Create Form Business Type
code = code.replace(
  /<label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">ประเภทธุรกิจ \(Business Type\) \*<\/label>\s*<select \s*name="businessType" \s*required/g,
  `<label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">ประเภทธุรกิจ (Business Type) {isCreateBusinessTypeRequired && '*'}</label>\n                  <select \n                    name="businessType" \n                    required={isCreateBusinessTypeRequired}`
);

// 6. Update Create Form New Business Type
code = code.replace(
  /<label className="text-xs font-black text-brand-red uppercase tracking-widest ml-1 italic">ระบุประเภทธุรกิจใหม่ \*<\/label>\s*<input \s*required \s*name="newBusinessType"/g,
  `<label className="text-xs font-black text-brand-red uppercase tracking-widest ml-1 italic">ระบุประเภทธุรกิจใหม่ {isCreateBusinessTypeRequired && '*'}</label>\n                    <input \n                      required={isCreateBusinessTypeRequired} \n                      name="newBusinessType"`
);

// 7. Update Create Form Customer Status
code = code.replace(
  /<label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">สถานะลูกค้า<\/label>\s*<select name="customerStatus" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red focus:ring-4 focus:ring-brand-red\/10 outline-none transition-all appearance-none">/g,
  `<label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">สถานะลูกค้า</label>\n                  <select name="customerStatus" value={newCustomerStatus} onChange={(e) => setNewCustomerStatus(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-brand-red focus:ring-4 focus:ring-brand-red/10 outline-none transition-all appearance-none">`
);

// 8. Update Create Form Address Fields
code = code.replace(
  /<label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">จังหวัด {createCustomerType !== 'บุคคลธรรมดา' && '\*'}<\/label>\s*<select \s*required={createCustomerType !== 'บุคคลธรรมดา'}/g,
  `<label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">จังหวัด {isCreateAddressRequired && '*'}</label>\n                  <select \n                    required={isCreateAddressRequired}`
);

code = code.replace(
  /<label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">เขต\/อำเภอ {createCustomerType !== 'บุคคลธรรมดา' && '\*'}<\/label>\s*<select \s*required={createCustomerType !== 'บุคคลธรรมดา'}/g,
  `<label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">เขต/อำเภอ {isCreateAddressRequired && '*'}</label>\n                  <select \n                    required={isCreateAddressRequired}`
);

code = code.replace(
  /<label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">แขวง\/ตำบล {createCustomerType !== 'บุคคลธรรมดา' && '\*'}<\/label>\s*<select \s*required={createCustomerType !== 'บุคคลธรรมดา'}/g,
  `<label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">แขวง/ตำบล {isCreateAddressRequired && '*'}</label>\n                  <select \n                    required={isCreateAddressRequired}`
);

code = code.replace(
  /<label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">ที่อยู่จดทะเบียน\/ที่อยู่หลัก \(Registered Address\) {createCustomerType !== 'บุคคลธรรมดา' && '\*'}<\/label>\s*<input required={createCustomerType !== 'บุคคลธรรมดา'}/g,
  `<label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">ที่อยู่จดทะเบียน/ที่อยู่หลัก (Registered Address) {isCreateAddressRequired && '*'}</label>\n                  <input required={isCreateAddressRequired}`
);

code = code.replace(
  /<label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">รหัสไปรษณีย์ {createCustomerType !== 'บุคคลธรรมดา' && '\*'}<\/label>\s*<input \s*required={createCustomerType !== 'บุคคลธรรมดา'}/g,
  `<label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">รหัสไปรษณีย์ {isCreateAddressRequired && '*'}</label>\n                  <input \n                    required={isCreateAddressRequired}`
);

// 9. Update Edit Form Customer Type
code = code.replace(
  /<label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">ประเภทลูกค้า \*<\/label>\s*<select\s*name="customerType"\s*required/g,
  `<label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">ประเภทลูกค้า {isEditCustomerTypeRequired && '*'}</label>\n                  <select \n                    name="customerType" \n                    required={isEditCustomerTypeRequired}`
);

// 10. Update Edit Form Business Type
code = code.replace(
  /<label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">ประเภทธุรกิจ \(Business Type\) \*<\/label>\s*<select \s*name="businessType" \s*required/g,
  `<label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">ประเภทธุรกิจ (Business Type) {isEditBusinessTypeRequired && '*'}</label>\n                  <select \n                    name="businessType" \n                    required={isEditBusinessTypeRequired}`
);

// 11. Update Edit Form New Business Type
code = code.replace(
  /<label className="text-xs font-black text-brand-red uppercase tracking-widest ml-1 italic">ระบุประเภทธุรกิจใหม่ \*<\/label>\s*<input \s*required \s*name="newBusinessType"/g,
  `<label className="text-xs font-black text-brand-red uppercase tracking-widest ml-1 italic">ระบุประเภทธุรกิจใหม่ {isEditBusinessTypeRequired && '*'}</label>\n                    <input \n                      required={isEditBusinessTypeRequired} \n                      name="newBusinessType"`
);

// 12. Update Edit Form Customer Status
code = code.replace(
  /<label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">สถานะลูกค้า<\/label>\s*<select name="customerStatus" defaultValue={editingCompany\.customerStatus \|\| 'ลูกค้าใหม่'}/g,
  `<label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">สถานะลูกค้า</label>\n                  <select name="customerStatus" value={editCustomerStatus} onChange={(e) => setEditCustomerStatus(e.target.value)}`
);

// 13. Update Edit Form Address Fields
code = code.replace(
  /<label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">ที่อยู่จดทะเบียน\/ที่อยู่หลัก \(Registered Address\) {editCustomerType !== 'บุคคลธรรมดา' && '\*'}<\/label>\s*<input required={editCustomerType !== 'บุคคลธรรมดา'}/g,
  `<label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">ที่อยู่จดทะเบียน/ที่อยู่หลัก (Registered Address) {isEditAddressRequired && '*'}</label>\n                  <input required={isEditAddressRequired}`
);

code = code.replace(
  /<label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">จังหวัด {editCustomerType !== 'บุคคลธรรมดา' && '\*'}<\/label>\s*<select \s*required={editCustomerType !== 'บุคคลธรรมดา'}/g,
  `<label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">จังหวัด {isEditAddressRequired && '*'}</label>\n                  <select \n                    required={isEditAddressRequired}`
);

code = code.replace(
  /<label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">เขต\/อำเภอ {editCustomerType !== 'บุคคลธรรมดา' && '\*'}<\/label>\s*<select \s*required={editCustomerType !== 'บุคคลธรรมดา'}/g,
  `<label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">เขต/อำเภอ {isEditAddressRequired && '*'}</label>\n                  <select \n                    required={isEditAddressRequired}`
);

code = code.replace(
  /<label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">แขวง\/ตำบล {editCustomerType !== 'บุคคลธรรมดา' && '\*'}<\/label>\s*<select \s*required={editCustomerType !== 'บุคคลธรรมดา'}/g,
  `<label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">แขวง/ตำบล {isEditAddressRequired && '*'}</label>\n                  <select \n                    required={isEditAddressRequired}`
);

code = code.replace(
  /<label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">รหัสไปรษณีย์ {editCustomerType !== 'บุคคลธรรมดา' && '\*'}<\/label>\s*<input \s*required={editCustomerType !== 'บุคคลธรรมดา'}/g,
  `<label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">รหัสไปรษณีย์ {isEditAddressRequired && '*'}</label>\n                  <input \n                    required={isEditAddressRequired}`
);


fs.writeFileSync(filePath, code);
console.log('Update successful!');
