<script lang="ts">
  import { ethers } from 'ethers'
  import { SafeService, type SerializedSafeTransaction } from './lib/SafeService'
  import { onMount } from 'svelte'
  
  let safeService = new SafeService()
  let status = ''
  let connectedAddress = ''
  let txWorker: Worker
  
  // Input fields
  let safeAddress = ''
  let recipientAddress = ''
  let transactionPayload = '0x'
  let ethValue = '0'
  let weiValue = '0'

  // Transaction data for sharing
  let serializedTxStr = ''
  let currentTx: SerializedSafeTransaction | null = null

  let activeWorkflow: 'create' | 'sign' = 'create'

  let canSign = false

  $: {
    // Update canSign whenever currentTx or connectedAddress changes
    if (currentTx && connectedAddress) {
      canSignTransaction().then(result => {
        canSign = result
      })
    } else {
      canSign = false
    }
  }

  onMount(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged)
    }

    // Initialize web worker
    txWorker = new Worker(new URL('./lib/txWorker.ts', import.meta.url), { type: 'module' })
    txWorker.onmessage = (e) => {
      const { error, tx } = e.data
      if (error) {
        status = error
        currentTx = null
      } else {
        currentTx = tx
        if (tx) {
          status = 'Transaction data loaded'
        }
      }
    }

    // Parse URL parameters
    const urlParams = new URLSearchParams(window.location.search)
    const safeAddrParam = urlParams.get('safeAddr')
    
    if (safeAddrParam) {
      safeAddress = safeAddrParam
      handleConnect() // Auto-connect if safe address is provided
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
      }
      // Cleanup worker
      txWorker?.terminate()
    }
  })

  async function handleAccountsChanged(accounts: string[]) {
    if (accounts.length === 0) {
      connectedAddress = ''
      status = 'Wallet disconnected'
    } else {
      if (safeAddress) {
        try {
          await safeService.connect(safeAddress)
          connectedAddress = await safeService.getAddress()
          status = 'Account changed successfully'
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          status = 'Failed to reconnect: ' + errorMessage
          connectedAddress = ''
        }
      }
    }
  }

  function handleEthValueChange(event: Event) {
    try {
      const input = (event.target as HTMLInputElement).value
      if (input === '') {
        ethValue = '0'
        weiValue = '0'
        return
      }
      ethValue = input
      weiValue = ethers.utils.parseEther(input).toString()
    } catch (error) {
      // If parsing fails, keep the ETH value but set Wei to 0
      weiValue = '0'
    }
  }

  async function handleConnect() {
    try {
      status = 'Connecting...'
      
      if (!safeAddress) {
        throw new Error('Please enter a Safe address')
      }
      
      await safeService.connect(safeAddress)
      connectedAddress = await safeService.getAddress()
      status = 'Connected successfully'
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      status = 'Connection failed: ' + errorMessage
    }
  }

  async function handleCreateTransaction() {
    try {
      if (!recipientAddress) {
        throw new Error('Please enter a recipient address')
      }

      if (!ethers.utils.isAddress(recipientAddress)) {
        throw new Error('Invalid recipient address')
      }

      if (!ethers.BigNumber.from(weiValue).gte(0)) {
        throw new Error('Value must be a non-negative amount')
      }

      status = 'Creating transaction...'
      
      const txData = {
        to: recipientAddress,
        value: weiValue,
        data: transactionPayload.startsWith('0x') ? transactionPayload : '0x' + transactionPayload
      }
      
      const result = await safeService.createTransaction(txData)
      currentTx = result.serializedTx
      serializedTxStr = JSON.stringify(currentTx, null, 2)
      status = 'Transaction created! Share the transaction data below with other signers'
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      status = 'Transaction creation failed: ' + errorMessage
    }
  }

  function handleTransactionDataChange() {
    // Send data to worker for parsing
    txWorker.postMessage({ txData: serializedTxStr })
  }

  async function canSignTransaction(): Promise<boolean> {
    if (!currentTx || !connectedAddress) return false
    
    // Check if the current address hasn't signed yet
    return !currentTx.signatures.some(sig => 
      sig.signer.toLowerCase() === connectedAddress.toLowerCase()
    )
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(serializedTxStr)
      status = 'Transaction data copied to clipboard!'
    } catch (error) {
      status = 'Failed to copy to clipboard. Please copy manually.'
    }
  }

  async function handleAddSignature() {
    try {
      if (!currentTx) {
        throw new Error('Please load a transaction first')
      }

      status = 'Adding signature...'
      const result = await safeService.addSignature(currentTx)
      currentTx = result.serializedTx
      serializedTxStr = JSON.stringify(currentTx, null, 2)
      status = 'Signature added successfully!'
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      status = 'Failed to add signature: ' + errorMessage
    }
  }

  async function handleExecuteTransaction() {
    try {
      if (!currentTx) {
        throw new Error('Please load a transaction first')
      }

      status = 'Executing transaction...'
      const response = await safeService.executeTransaction(currentTx)
      status = 'Transaction executed! Hash: ' + response.hash
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      status = 'Transaction execution failed: ' + errorMessage
    }
  }

  function getSignatureCount(tx: SerializedSafeTransaction | null): number {
    return tx?.signatures?.length || 0
  }

  function isCurrentSigner(signerAddress: string): boolean {
    return connectedAddress.toLowerCase() === signerAddress.toLowerCase()
  }
</script>

<main>
  <h1>Safe Protocol Minimal</h1>
  
  <div class="guide-steps">
    <div class="step">
      <span class="step-number">1</span>
      <div class="step-content">
        <h3>Connect to Safe</h3>
        <p>Enter your Safe address and connect your wallet to get started.</p>
      </div>
    </div>
  </div>

  <div class="form-group">
    <label for="safe-address">
      Safe Address:
      <span class="tooltip" data-tooltip="The address of your Safe multi-signature wallet">ⓘ</span>
    </label>
    <div class="input-group">
      <input 
        id="safe-address"
        type="text" 
        bind:value={safeAddress} 
        placeholder="Enter Safe address (0x...)"
      />
      <button class="primary-button" on:click={handleConnect}>Connect Wallet</button>
    </div>
  </div>

  {#if connectedAddress}
    <div class="workflow-selector">
      <button 
        class="tab-button {activeWorkflow === 'create' ? 'active' : ''}"
        on:click={() => activeWorkflow = 'create'}
      >
        Create New Transaction
      </button>
      <button 
        class="tab-button {activeWorkflow === 'sign' ? 'active' : ''}"
        on:click={() => activeWorkflow = 'sign'}
      >
        Sign Existing Transaction
      </button>
    </div>

    {#if activeWorkflow === 'create'}
      <div class="guide-steps">
        <div class="step">
          <span class="step-number">2</span>
          <div class="step-content">
            <h3>Create Transaction</h3>
            <p>Fill in the transaction details to create a new transaction that requires signatures.</p>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Create Transaction</h2>
        <div class="form-group">
          <label for="recipient-address">
            To:
            <span class="tooltip" data-tooltip="The Ethereum address that will receive this transaction">ⓘ</span>
          </label>
          <input 
            id="recipient-address"
            type="text" 
            bind:value={recipientAddress} 
            placeholder="Recipient address (0x...)"
          />
        </div>

        <div class="form-group">
          <label for="transaction-value">
            Value (ETH):
            <span class="tooltip" data-tooltip="Amount of ETH to send">ⓘ</span>
          </label>
          <input 
            id="transaction-value"
            type="number" 
            value={ethValue}
            on:input={handleEthValueChange}
            min="0"
            step="0.000000000000000001"
            placeholder="0.0"
          />
          <span class="helper-text">Wei: {weiValue}</span>
        </div>

        <div class="form-group">
          <label for="transaction-payload">
            Data:
            <span class="tooltip" data-tooltip="Optional: Hexadecimal data for contract interactions">ⓘ</span>
          </label>
          <input 
            id="transaction-payload"
            type="text" 
            bind:value={transactionPayload} 
            placeholder="0x... (optional)"
          />
        </div>

        <button class="primary-button" on:click={handleCreateTransaction}>Create Transaction</button>
      </div>

      <div class="guide-steps">
        <div class="step">
          <span class="step-number">3</span>
          <div class="step-content">
            <h3>Share Transaction</h3>
            <p>Share the transaction data with other signers for their signatures.</p>
          </div>
        </div>
      </div>
    {:else}
      <div class="guide-steps">
        <div class="step">
          <span class="step-number">2</span>
          <div class="step-content">
            <h3>Sign Transaction</h3>
            <p>Paste the transaction data shared with you to sign it.</p>
          </div>
        </div>
      </div>
    {/if}

    <div class="section">
      <h2>Sign & Execute</h2>
      <div class="form-group">
        <label for="transaction-data">
          Transaction Data
          {#if currentTx && getSignatureCount(currentTx) > 0}
            <span class="label-badge">
              {getSignatureCount(currentTx)} signature{getSignatureCount(currentTx) > 1 ? 's' : ''}
            </span>
          {/if}
          <span class="tooltip" data-tooltip="Paste transaction data here to sign, or copy to share with other signers">ⓘ</span>
        </label>
        <div class="textarea-container">
          <textarea
            id="transaction-data"
            bind:value={serializedTxStr}
            on:input={handleTransactionDataChange}
            placeholder={activeWorkflow === 'create' 
              ? "Your transaction data will appear here after creation" 
              : "Paste transaction data here to sign it"}
            rows="8"
          />
          {#if serializedTxStr}
            <button class="icon-button" on:click={copyToClipboard}>
              Copy
            </button>
          {/if}
        </div>
        {#if currentTx && getSignatureCount(currentTx) > 0}
          <span class="helper-text">👆 Copy this data to share with other signers</span>
        {/if}
      </div>

      <div class="button-group">
        <button 
          on:click={handleAddSignature} 
          class="secondary-button"
          disabled={!currentTx || !canSign}
        >
          <span class="button-icon">✍️</span> Sign
        </button>
        <button 
          on:click={handleExecuteTransaction} 
          class="execute-button"
          disabled={!currentTx}
        >
          <span class="button-icon">🚀</span> Execute
        </button>
      </div>

      {#if currentTx}
        <div class="transaction-info">
          <h3>Current Transaction</h3>
          <div class="info-grid">
            <div>To: <code>{currentTx.to}</code></div>
            <div>Value: <code>{ethers.utils.formatEther(currentTx.value)} ETH</code></div>
            <div>Data: <code>{currentTx.data}</code></div>
            <div>
              Signatures ({currentTx.signatures.length}):
              <ul>
                {#each currentTx.signatures as signature}
                  <li>
                    <code class={isCurrentSigner(signature.signer) ? 'current-signer' : ''}>
                      {signature.signer}
                      {#if isCurrentSigner(signature.signer)}
                        <span class="signature-badge">Your signature</span>
                      {/if}
                    </code>
                  </li>
                {/each}
              </ul>
            </div>
          </div>
          {#if !canSign && currentTx.signatures.some(sig => isCurrentSigner(sig.signer))}
            <div class="signature-status">
              <span class="status-icon">✓</span>
              You have already signed this transaction
            </div>
          {/if}
        </div>
      {/if}
    </div>

    <div class="status-bar">
      {#if connectedAddress}
        <div class="status-group">
          <span class="status-label">Connected:</span>
          <span class="address">{connectedAddress}</span>
        </div>
      {/if}
      {#if status}
        <span class="status">{status}</span>
      {/if}
    </div>
  {/if}

  {#if !connectedAddress}
    <div class="status-bar">
      <span class="status">{status}</span>
    </div>
  {/if}
</main>

<style>
  main {
    padding: 1.5rem;
    max-width: 720px;
    margin: 0 auto;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }

  h1 {
    font-size: 1.75rem;
    margin-bottom: 2rem;
    color: #1a1a1a;
    text-align: center;
  }

  h2 {
    font-size: 1.25rem;
    margin-bottom: 1rem;
    color: #2c2c2c;
  }

  .guide-steps {
    margin: 2rem 0;
  }

  .step {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .step-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    background: #2196f3;
    color: white;
    border-radius: 50%;
    font-weight: bold;
    flex-shrink: 0;
  }

  .step-content {
    flex-grow: 1;
  }

  .step-content h3 {
    margin: 0;
    font-size: 1.1rem;
    color: #2c2c2c;
  }

  .step-content p {
    margin: 0.5rem 0 0;
    color: #666;
    font-size: 0.9rem;
  }

  .section {
    margin: 1.5rem 0;
    padding: 1.25rem;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background: #ffffff;
  }

  .form-group {
    margin: 1rem 0;
  }

  .form-group label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #424242;
  }

  .input-group {
    display: flex;
    gap: 0.5rem;
  }

  .input-group input {
    flex-grow: 1;
  }

  input, textarea {
    width: 100%;
    padding: 0.625rem;
    font-size: 0.9375rem;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    background: #fafafa;
    transition: border-color 0.2s, background-color 0.2s;
  }

  input:focus, textarea:focus {
    outline: none;
    border-color: #2196f3;
    background: #ffffff;
  }

  textarea {
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 0.875rem;
    resize: vertical;
  }

  .helper-text {
    display: block;
    margin-top: 0.375rem;
    font-size: 0.8125rem;
    color: #666666;
  }

  .tooltip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.25rem;
    height: 1.25rem;
    border-radius: 50%;
    background: #e0e0e0;
    color: #666;
    font-size: 0.75rem;
    cursor: help;
    position: relative;
  }

  .tooltip:hover::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    padding: 0.5rem;
    background: #424242;
    color: white;
    font-size: 0.75rem;
    border-radius: 4px;
    white-space: nowrap;
    z-index: 1;
    margin-bottom: 0.5rem;
  }

  .tooltip:hover::before {
    content: '';
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 0.25rem solid transparent;
    border-top-color: #424242;
    margin-bottom: 0.25rem;
  }

  button {
    padding: 0.5rem 1rem;
    font-size: 0.9375rem;
    font-weight: 500;
    color: #ffffff;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .primary-button {
    background: #2196f3;
  }

  .primary-button:hover {
    background: #1976d2;
  }

  .secondary-button {
    background: #757575;
  }

  .secondary-button:hover {
    background: #616161;
  }

  .execute-button {
    background: #4caf50;
  }

  .execute-button:hover {
    background: #388e3c;
  }

  .button-icon {
    font-size: 1rem;
  }

  .button-group {
    display: flex;
    gap: 0.75rem;
  }

  .icon-button {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    padding: 0.25rem 0.5rem;
    font-size: 0.8125rem;
    background: #757575;
  }

  .icon-button:hover {
    background: #616161;
  }

  .textarea-container {
    position: relative;
  }

  .label-badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    margin-left: 0.5rem;
    font-size: 0.75rem;
    color: #ffffff;
    background: #4caf50;
    border-radius: 1rem;
  }

  .transaction-info {
    margin-top: 1.5rem;
    padding: 1rem;
    background: #f5f5f5;
    border-radius: 6px;
  }

  .info-grid {
    display: grid;
    gap: 0.75rem;
  }

  .info-grid code {
    display: inline-block;
    padding: 0.125rem 0.25rem;
    font-size: 0.875rem;
    background: #e0e0e0;
    border-radius: 4px;
    word-break: break-all;
  }

  .status-bar {
    margin-top: 1.5rem;
    padding: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f5f5f5;
    border-radius: 6px;
    font-size: 0.875rem;
    gap: 1rem;
  }

  .status-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .status-label {
    color: #666666;
  }

  .status {
    color: #666666;
    text-align: right;
    flex-shrink: 0;
  }

  .address {
    color: #2196f3;
    font-family: monospace;
    word-break: break-all;
  }

  ul {
    margin: 0.5rem 0;
    padding-left: 1.25rem;
  }

  li {
    margin: 0.25rem 0;
  }

  @media (max-width: 600px) {
    .input-group {
      flex-direction: column;
    }
    
    .button-group {
      flex-direction: column;
    }
    
    button {
      width: 100%;
      justify-content: center;
    }
  }

  .workflow-selector {
    display: flex;
    gap: 1rem;
    margin: 2rem 0;
  }

  .tab-button {
    flex: 1;
    padding: 0.75rem;
    font-size: 0.9375rem;
    font-weight: 500;
    color: #666;
    background: #f5f5f5;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .tab-button.active {
    color: #2196f3;
    background: #fff;
    border-color: #2196f3;
  }

  .tab-button:hover:not(.active) {
    background: #eeeeee;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  .current-signer {
    border: 1px solid #4caf50 !important;
    background: #e8f5e9 !important;
  }

  .signature-badge {
    display: inline-block;
    margin-left: 0.5rem;
    padding: 0.125rem 0.375rem;
    font-size: 0.75rem;
    color: #ffffff;
    background: #4caf50;
    border-radius: 1rem;
    vertical-align: middle;
  }

  .signature-status {
    margin-top: 1rem;
    padding: 0.75rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: #e8f5e9;
    border: 1px solid #4caf50;
    border-radius: 4px;
    color: #2e7d32;
    font-weight: 500;
  }

  .status-icon {
    font-size: 1.25rem;
    line-height: 1;
  }
</style> 