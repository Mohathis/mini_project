

async function run() {
  const response = await fetch('http://localhost:5000/api/equipment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      equipmentId: "EQ-TEST-999",
      name: "Test Defibrillator",
      category: "Medical",
      department: "Emergency",
      location: "ER Room 2",
      model: "BeneHeart D3",
      serialNumber: "SN-9823984",
      manufacturer: "Mindray",
      installationDate: "2024-03-12T00:00:00.000Z",
      warrantyExpiration: "2027-03-12T00:00:00.000Z",
      status: "Operational",
      nextPreventiveMaintenance: "2026-07-15T00:00:00.000Z",
      pmFrequency: "Quarterly"
    })
  });
  const data = await response.json();
  console.log('Post response:', data);
}

run();
