// Worker to handle transaction data parsing
self.onmessage = (e) => {
  const { txData } = e.data
  
  try {
    if (!txData?.trim()) {
      self.postMessage({ error: null, tx: null })
      return
    }

    const parsedTx = JSON.parse(txData)
    
    // Basic validation of transaction data structure
    if (!parsedTx.to || !parsedTx.value || !parsedTx.data || !Array.isArray(parsedTx.signatures)) {
      throw new Error('Invalid transaction format')
    }

    self.postMessage({ error: null, tx: parsedTx })
  } catch (error) {
    self.postMessage({ 
      error: error instanceof Error ? error.message : 'Invalid transaction data',
      tx: null 
    })
  }
} 