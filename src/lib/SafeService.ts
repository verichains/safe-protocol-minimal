import { ethers } from 'ethers'
import Safe, { type SafeAccountConfig } from '@safe-global/protocol-kit'
import { type SafeTransactionDataPartial } from '@safe-global/types-kit'
import type { MetaTransactionData } from '@safe-global/types-kit'

export interface SerializedSafeTransaction {
  to: string
  value: string
  data: string
  signatures: {
    signer: string
    data: string
  }[]
  nonce?: number
}

export class SafeService {
  private signer: ethers.Signer
  private protocolKit: Safe
  private safeAddress: string = ''

  constructor() {
    // Initialize empty - will be set in connect()
    this.signer = {} as ethers.Signer
    this.protocolKit = {} as Safe
  }

  async connectWallet() {
    if (!window.ethereum) {
      throw new Error('No web3 provider found. Please install MetaMask.')
    }

    // Setup provider and signer using browser wallet
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    
    // Request account access
    await provider.send("eth_requestAccounts", [])
    this.signer = provider.getSigner()
  }

  async connect(safeAddress: string) {
    if (!this.signer.provider) {
      await this.connectWallet()
    }

    this.safeAddress = safeAddress

    // Initialize Protocol Kit with the new API
    this.protocolKit = await Safe.init({
      provider: window.ethereum,
      signer: await this.signer.getAddress(),
      safeAddress
    })
  }

  async createSafe(owners: string[], threshold: number) {
    if (!this.signer.provider) {
      throw new Error('Wallet not connected. Please connect wallet first.')
    }
    
    const safeAccountConfig: SafeAccountConfig = {
      owners,
      threshold,
    }
    
    // Initialize Protocol Kit for deployment
    const protocolKit = await Safe.init({
      provider: window.ethereum,
      signer: await this.signer.getAddress(),
      predictedSafe: {
        safeAccountConfig
      }
    })
    
    // Get the predicted address
    const newSafeAddress = await protocolKit.getAddress()
    
    // Deploy the Safe at the predicted address
    const tx = await protocolKit.createSafeDeploymentTransaction();
    
    const txResponse = await this.signer.sendTransaction(tx);
    console.log(txResponse);

    await txResponse.wait();

    return newSafeAddress
  }

  async createTransaction(txData: SafeTransactionDataPartial) {
    try {
      // Create transaction with updated API
      const transaction: MetaTransactionData = {
        to: txData.to,
        value: txData.value || '0',
        data: txData.data || '0x'
      }

      const safeTransaction = await this.protocolKit.createTransaction({ 
        transactions: [transaction]
      })

      // Sign transaction
      const signedTx = await this.protocolKit.signTransaction(safeTransaction)
      
      // Get the signature
      const signatures = Array.from(signedTx.signatures.entries())
        .map((entry) => {
          const [signer, sig] = entry as [string, { data: string }]
          return {
            signer,
            data: sig.data
          }
        })

      // Create serializable transaction data
      const serializedTx: SerializedSafeTransaction = {
        to: signedTx.data.to,
        value: signedTx.data.value,
        data: signedTx.data.data || '0x',
        signatures,
        nonce: signedTx.data.nonce
      }

      return {
        serializedTx,
        txHash: await this.protocolKit.getTransactionHash(signedTx)
      }
    } catch (error) {
      console.error('Error creating transaction:', error)
      throw error
    }
  }

  async addSignature(serializedTx: SerializedSafeTransaction) {
    try {
      // Create a new transaction object with updated API
      const transaction: MetaTransactionData = {
        to: serializedTx.to,
        value: serializedTx.value,
        data: serializedTx.data
      }

      const safeTransaction = await this.protocolKit.createTransaction({
        transactions: [transaction]
      })

      // Add existing signatures with updated signature format
      for (const sig of serializedTx.signatures) {
        safeTransaction.addSignature({
          signer: sig.signer,
          data: sig.data,
          isContractSignature: false,
          staticPart: () => sig.data.slice(0, 130),
          dynamicPart: () => sig.data.slice(130)
        })
      }

      // Sign the transaction
      const signedTx = await this.protocolKit.signTransaction(safeTransaction)
      
      // Get all signatures including the new one
      const signatures = Array.from(signedTx.signatures.entries())
        .map((entry) => {
          const [signer, sig] = entry as [string, { data: string }]
          return {
            signer,
            data: sig.data
          }
        })

      // Return updated serialized transaction
      return {
        serializedTx: {
          ...serializedTx,
          signatures
        },
        txHash: await this.protocolKit.getTransactionHash(signedTx)
      }
    } catch (error) {
      console.error('Error adding signature:', error)
      throw error
    }
  }

  async executeTransaction(serializedTx: SerializedSafeTransaction) {
    try {
      // Create a new transaction object with updated API
      const transaction: MetaTransactionData = {
        to: serializedTx.to,
        value: serializedTx.value,
        data: serializedTx.data
      }

      const safeTransaction = await this.protocolKit.createTransaction({
        transactions: [transaction]
      })

      // Add all collected signatures with updated signature format
      for (const sig of serializedTx.signatures) {
        safeTransaction.addSignature({
          signer: sig.signer,
          data: sig.data,
          isContractSignature: false,
          staticPart: () => sig.data.slice(0, 130),
          dynamicPart: () => sig.data.slice(130)
        })
      }
      
      // Execute transaction
      const response = await this.protocolKit.executeTransaction(safeTransaction)
      return response
    } catch (error) {
      console.error('Error executing transaction:', error)
      throw error
    }
  }

  async getAddress(): Promise<string> {
    return await this.signer.getAddress()
  }
} 