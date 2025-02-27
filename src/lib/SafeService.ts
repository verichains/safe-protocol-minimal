import { ethers } from 'ethers'
import Safe, { EthersAdapter } from '@safe-global/protocol-kit'
import type { SafeTransactionDataPartial } from '@safe-global/safe-core-sdk-types'

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

  async connect(safeAddress: string) {
    if (!window.ethereum) {
      throw new Error('No web3 provider found. Please install MetaMask.')
    }

    this.safeAddress = safeAddress

    // Setup provider and signer using browser wallet
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    
    // Request account access
    await provider.send("eth_requestAccounts", [])
    this.signer = provider.getSigner()

    // Create EthAdapter
    const ethAdapter = new EthersAdapter({
      ethers,
      signerOrProvider: this.signer
    })

    // Initialize Protocol Kit
    this.protocolKit = await Safe.create({
      ethAdapter,
      safeAddress
    })
  }

  async createTransaction(txData: SafeTransactionDataPartial) {
    try {
      // Create transaction
      const safeTransaction = await this.protocolKit.createTransaction({
        safeTransactionData: txData
      })

      // Sign transaction
      const signedTx = await this.protocolKit.signTransaction(safeTransaction)
      
      // Get the signature
      const signerAddress = await this.signer.getAddress()
      const signatures = Array.from(signedTx.signatures.entries()).map(([signer, sig]) => ({
        signer,
        data: sig.data
      }))

      // Create serializable transaction data
      const serializedTx: SerializedSafeTransaction = {
        to: signedTx.data.to,
        value: signedTx.data.value,
        data: signedTx.data.data,
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
      // Create a new transaction object
      const safeTransaction = await this.protocolKit.createTransaction({
        safeTransactionData: {
          to: serializedTx.to,
          value: serializedTx.value,
          data: serializedTx.data,
          nonce: serializedTx.nonce
        }
      })

      // Add existing signatures
      serializedTx.signatures.forEach(sig => {
        safeTransaction.addSignature({
          signer: sig.signer,
          data: sig.data
        })
      })

      // Sign the transaction
      const signedTx = await this.protocolKit.signTransaction(safeTransaction)
      
      // Get the new signature
      const signerAddress = await this.signer.getAddress()
      const signatures = Array.from(signedTx.signatures.entries()).map(([signer, sig]) => ({
        signer,
        data: sig.data
      }))

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
      // Create a new transaction object
      const safeTransaction = await this.protocolKit.createTransaction({
        safeTransactionData: {
          to: serializedTx.to,
          value: serializedTx.value,
          data: serializedTx.data,
          nonce: serializedTx.nonce
        }
      })

      // Add all collected signatures
      serializedTx.signatures.forEach(sig => {
        safeTransaction.addSignature({
          signer: sig.signer,
          data: sig.data
        })
      })
      
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