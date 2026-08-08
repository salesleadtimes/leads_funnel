// function uid() {
//   return 'HPQ-' + Math.random().toString(36).slice(2, 8).toUpperCase();
// }

// function daysAgo(n) {
//   const d = new Date();
//   d.setDate(d.getDate() - n);
//   return d.toISOString().slice(0, 10);
// }

// export function seedState() {
//   const leads = [
//     { id: uid(), orgName: 'District Collectorate, Muzaffarnagar', sector: 'Government', deptIndustry: 'Revenue Dept', contactPerson: 'R.K. Sharma', phone: '9876543210', email: '', productCategory: 'MFD (Multi-Function Device)', model: 'HP LaserJet MFP M436n', qty: 12, estValue: 540000, source: 'Government Tender (CPPP/eProc)', tenderRef: 'MZN/2026/IT/017', stage: 'Technical Evaluation', expectedClose: daysAgo(-10), nextFollowUp: daysAgo(-2), salesPerson: 'RK Jindal', remarks: 'EMD submitted, awaiting technical bid opening.', createdDate: daysAgo(18), closedDate: null },
//     { id: uid(), orgName: 'Sanskriti Public School', sector: 'Non-Government', deptIndustry: 'Education', contactPerson: 'Principal Office', phone: '9812345670', email: '', productCategory: 'LaserJet Printer', model: 'HP LaserJet Pro M15w', qty: 5, estValue: 65000, source: 'Referral', tenderRef: '', stage: 'Won', expectedClose: daysAgo(3), nextFollowUp: null, salesPerson: 'RK Jindal', remarks: 'PO received and delivered.', createdDate: daysAgo(20), closedDate: daysAgo(3) },
//     { id: uid(), orgName: 'UP State Medical College', sector: 'Government', deptIndustry: 'Health Dept', contactPerson: 'Dr. Verma', phone: '', email: '', productCategory: 'Document Scanner', model: 'HP ScanJet Pro N4600', qty: 8, estValue: 312000, source: 'GeM Portal', tenderRef: 'GEM/2026/B/998231', stage: 'Quotation / Bid Submitted', expectedClose: daysAgo(-20), nextFollowUp: daysAgo(-5), salesPerson: 'Sales Team', remarks: 'L1 status pending.', createdDate: daysAgo(9), closedDate: null },
//     { id: uid(), orgName: 'Aarohi Textiles Pvt Ltd', sector: 'Non-Government', deptIndustry: 'Manufacturing', contactPerson: 'Purchase Mgr', phone: '9911223344', email: '', productCategory: 'Ink / Toner Cartridge', model: 'HP 26A Toner', qty: 40, estValue: 88000, source: 'Existing Customer Repeat', tenderRef: '', stage: 'PO / Work Order Received', expectedClose: daysAgo(-2), nextFollowUp: daysAgo(-1), salesPerson: 'RK Jindal', remarks: 'Repeat monthly order.', createdDate: daysAgo(4), closedDate: null },
//     { id: uid(), orgName: 'Panchayati Raj Dept, Meerut', sector: 'Government', deptIndustry: 'Rural Development', contactPerson: 'BDO Office', phone: '', email: '', productCategory: 'Inkjet Printer', model: 'HP Smart Tank 519', qty: 25, estValue: 275000, source: 'Direct Government RFQ', tenderRef: 'PRD/MRT/26/44', stage: 'New Lead', expectedClose: daysAgo(-30), nextFollowUp: daysAgo(-3), salesPerson: 'Sales Team', remarks: 'Enquiry received via block office.', createdDate: daysAgo(1), closedDate: null },
//     { id: uid(), orgName: 'Rotary Club Muzaffarnagar Sanskriti', sector: 'Non-Government', deptIndustry: 'NGO / Community', contactPerson: 'Secretary', phone: '', email: '', productCategory: 'MFD (Multi-Function Device)', model: 'HP LaserJet MFP M139', qty: 1, estValue: 22000, source: 'Referral', tenderRef: '', stage: 'Lost', expectedClose: daysAgo(6), nextFollowUp: null, salesPerson: 'RK Jindal', remarks: 'Went with a competitor on price.', createdDate: daysAgo(15), closedDate: daysAgo(6) }
//   ];

//   const targets = { daily: 15000, weekly: 100000, monthly: 400000, quarterly: 1200000, yearly: 5000000 };

//   return { leads, targets };
// }
