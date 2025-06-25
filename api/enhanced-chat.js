export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    console.log('Enhanced chat called successfully');
    
    const { cryptoData, requestType = 'segment', fieldIntel } = req.body;
    
    // Generate content based on whether there's field intel
    let content;
    
    if (fieldIntel) {
      content = `OINK OINK! This is Porky with BREAKING intel straight from my piggies in the field! ${fieldIntel} This is absolutely mental! My sources are going crazy right now and this could change everything! Let me dig deeper while we pump some serious beats!`;
    } else {
      const personalities = [
        `OINK OINK crypto degenerates! Porky here with some hot intel fresh from the streets! The smart money is moving while everyone else is sleeping and I can smell opportunity in the air like truffles! Time to bacon some gains with this absolute banger!`,
        `What's good my beautiful degenerates! Your boy Porky just got word from my whale contacts that something big is brewing in the markets! The normies have no idea what's coming but we're about to feast like pigs at a crypto buffet!`,
        `OINK! The underground network is buzzing and my phone won't stop ringing with insider tips! While the mainstream media talks garbage, we're over here making moves and printing money! This next track is going to be as fire as our portfolios!`
      ];
      content = personalities[Math.floor(Math.random() * personalities.length)];
    }
    
    res.status(200).json({ 
      content,
      metadata: {
        status: 'working',
        hasFieldIntel: !!fieldIntel,
        requestType
      }
    });
    
  } catch (error) {
    console.error('Enhanced chat error:', error);
    res.status(500).json({ error: error.message });
  }
}
