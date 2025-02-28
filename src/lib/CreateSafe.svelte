<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import type { SafeService } from './SafeService'

  export let safeService: SafeService

  const dispatch = createEventDispatcher()

  let owners: string[] = ['']
  let threshold = 1
  let status = ''
  let isError = false

  function addOwner() {
    owners = [...owners, '']
  }

  function removeOwner(index: number) {
    owners = owners.filter((_, i) => i !== index)
    if (threshold > owners.length) {
      threshold = owners.length
    }
  }

  function updateOwner(index: number, event: Event) {
    const input = event.target as HTMLInputElement
    owners[index] = input.value
    owners = [...owners]
  }

  async function handleCreateSafe() {
    try {
      const validOwners = owners.filter(owner => owner.trim() !== '')
      if (validOwners.length === 0) {
        throw new Error('At least one owner address is required')
      }

      if (threshold > validOwners.length) {
        throw new Error('Threshold cannot be greater than number of owners')
      }

      isError = false
      status = 'Creating Safe...'
      await safeService.createSafe(validOwners, threshold)
      status = 'Safe created successfully! 🎉'
      dispatch('safecreated')
    } catch (error) {
      isError = true
      status = error instanceof Error ? error.message : 'Failed to create Safe'
    }
  }
</script>

<div class="create-safe-container">
  <h2>Create New Safe</h2>
  
  <div class="form-group">
    <label for="owners">
      Owners
      <span class="tooltip" title="Add Ethereum addresses that will be able to approve transactions">ⓘ</span>
    </label>
    
    {#each owners as owner, i}
      <div class="owner-input">
        <input
          type="text"
          placeholder="Owner address (0x...)"
          value={owner}
          on:input={(e) => updateOwner(i, e)}
        />
        {#if owners.length > 1}
          <button class="icon-button remove" on:click={() => removeOwner(i)}>
            ×
          </button>
        {/if}
      </div>
    {/each}
    
    <button class="secondary-button" on:click={addOwner}>
      + Add Owner
    </button>
  </div>

  <div class="form-group">
    <label for="threshold">
      Required Confirmations
      <span class="tooltip" title="Number of owners required to approve a transaction">ⓘ</span>
    </label>
    <input
      type="number"
      id="threshold"
      min="1"
      max={owners.length}
      bind:value={threshold}
    />
    <span class="helper-text">
      This Safe will require {threshold} out of {owners.length} owner{owners.length > 1 ? 's' : ''} to confirm transactions
    </span>
  </div>

  <button
    class="primary-button"
    on:click={handleCreateSafe}
    disabled={!owners.some(owner => owner.trim() !== '')}
  >
    Create Safe 🔐
  </button>

  {#if status}
    <div class="status-message" class:error={isError}>
      {status}
    </div>
  {/if}
</div>

<style>
  .create-safe-container {
    max-width: 600px;
    margin: 0 auto;
    padding: 1.25rem;
    background: #ffffff;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
  }

  h2 {
    font-size: 1.25rem;
    margin-bottom: 1.5rem;
    color: #2c2c2c;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  h2::after {
    content: '🔐';
    font-size: 1.25rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    font-weight: 500;
    color: #424242;
  }

  .owner-input {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
    align-items: center;
    background: #fafafa;
    padding: 0.5rem;
    border-radius: 6px;
    border: 1px solid #e0e0e0;
    transition: border-color 0.2s;
  }

  .owner-input:hover {
    border-color: #2196f3;
  }

  .owner-input input {
    flex: 1;
    padding: 0.5rem;
    font-size: 0.9375rem;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    background: #ffffff;
    transition: all 0.2s;
  }

  .owner-input input:focus {
    outline: none;
    border-color: #2196f3;
    box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.1);
  }

  .icon-button.remove {
    padding: 0.5rem;
    background: #ffebee;
    color: #c62828;
    border: 1px solid #ef5350;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
  }

  .icon-button.remove:hover {
    background: #ef5350;
    color: white;
  }

  .secondary-button {
    width: 100%;
    padding: 0.75rem;
    background: #f5f5f5;
    color: #2196f3;
    border: 1px dashed #2196f3;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .secondary-button:hover {
    background: #e3f2fd;
  }

  input[type="number"] {
    width: 100px;
    padding: 0.5rem;
    font-size: 0.9375rem;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    background: #fafafa;
    transition: all 0.2s;
  }

  input[type="number"]:focus {
    outline: none;
    border-color: #2196f3;
    background: #ffffff;
    box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.1);
  }

  .helper-text {
    display: block;
    margin-top: 0.5rem;
    font-size: 0.875rem;
    color: #666;
    line-height: 1.4;
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
    transition: all 0.2s;
  }

  .tooltip:hover {
    background: #2196f3;
    color: white;
  }

  .primary-button {
    width: 100%;
    padding: 0.75rem;
    background: #2196f3;
    color: white;
    border: none;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .primary-button:hover {
    background: #1976d2;
  }

  .primary-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .status-message {
    margin-top: 1rem;
    padding: 1rem;
    border-radius: 6px;
    font-size: 0.9375rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .status-message:not(.error) {
    background: #e8f5e9;
    color: #2e7d32;
    border: 1px solid #4caf50;
  }

  .status-message.error {
    background: #ffebee;
    color: #c62828;
    border: 1px solid #ef5350;
  }

  .status-message::before {
    content: '✓';
    font-size: 1.25rem;
  }

  .status-message.error::before {
    content: '⚠';
  }

  @media (max-width: 600px) {
    .create-safe-container {
      padding: 1rem;
      margin: 0;
      border-radius: 0;
      border-left: none;
      border-right: none;
    }

    .owner-input {
      flex-direction: column;
      gap: 0.5rem;
    }

    .icon-button.remove {
      align-self: flex-end;
    }
  }
</style> 