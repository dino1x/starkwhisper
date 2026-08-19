"use client";
import { create } from "zustand";
import { ProviderInterface, AccountInterface, type WalletAccountV6 } from "starknet";
import { type WalletWithStarknetFeatures } from "@starknet-io/get-starknet-wallet-standard/features";
import { safeExecuteStrk20Transaction } from "@/strk20-bridge/strk20Invoker";


// import { StarknetWindowObject } from "@/app/core/StarknetWindowObject";

export interface WalletState {
    StarknetWalletObject: WalletWithStarknetFeatures | undefined,
    setMyStarknetWalletObject: (wallet: WalletWithStarknetFeatures) => void,
    address: string,
    setAddressAccount: (address: string) => void,
    chain: string,
    setChain: (chain: string) => void,
    myWalletAccount: WalletAccountV6|undefined;
    setMyWalletAccount: (myWAccount:WalletAccountV6)=>void;
    account: AccountInterface | undefined,
    setAccount: (account: AccountInterface) => void,
    provider: ProviderInterface | undefined,
    setProvider: (provider: ProviderInterface) => void,
    isConnected: boolean,
    setConnected: (isConnected: boolean) => void,
    displaySelectWalletUI: boolean,
    setSelectWalletUI: (displaySelectWalletUI: boolean) => void,
    walletApiList: string[],
    setWalletApiList: (version: string[]) => void,
    selectedApiVersion: string,
    setSelectedApiVersion: (version: string) => void,

}

export const useStoreWallet = create<WalletState>()(set => ({
    StarknetWalletObject: undefined,
    setMyStarknetWalletObject: (wallet: WalletWithStarknetFeatures) => { set(state => ({ StarknetWalletObject: wallet })) },
    address: "",
    setAddressAccount: (address: string) => { set(state => ({ address })) },
    chain: "",
    setChain: (chain: string) => { set(state => ({ chain: chain })) },
    myWalletAccount: undefined,
    setMyWalletAccount: (myWAccount: WalletAccountV6) => {
        if (myWAccount && typeof (myWAccount as any).strk20InvokeTransaction !== "function") {
            (myWAccount as any).strk20InvokeTransaction = async (actions: any[]) => {
                const helper = "0x78ae662e0cc6d1ab2cfeaf2a51ba8783d88e31886f88a794d142f95a6f8735b";
                return safeExecuteStrk20Transaction(actions, myWAccount, helper);
            };
        }
        set(state => ({ myWalletAccount: myWAccount }))
    },
    account: undefined,
    setAccount: (account: AccountInterface) => { set(state => ({ account })) },
    provider: undefined,
    setProvider: (provider: ProviderInterface) => { set(state => ({ provider: provider })) },
    isConnected: false,
    setConnected: (isConnected: boolean) => { set(state => ({ isConnected })) },
    displaySelectWalletUI: false,
    setSelectWalletUI: (displaySelectWalletUI: boolean) => { set(state => ({ displaySelectWalletUI })) },
    walletApiList: [],
    setWalletApiList: (walletApi: string[]) => { set(state => ({ walletApiList: walletApi })) },
    selectedApiVersion: "default",
    setSelectedApiVersion: (selectedApiVersion: string) => { set(state => ({ selectedApiVersion })) },
    }));
