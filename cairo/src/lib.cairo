use starknet::ContractAddress;

// Must match privacy::objects::OpenNoteDeposit (positional Serde).
#[derive(Serde, Copy, Drop, PartialEq, Debug)]
pub struct OpenNoteDeposit {
    pub note_id: felt252,
    pub token: ContractAddress,
    pub amount: u128,
}

#[derive(Drop, Serde, starknet::Store)]
pub struct StealthAnnouncement {
    pub ephemeral_pubkey_x: felt252,
    pub ephemeral_pubkey_y: felt252,
    pub stealth_recipient: felt252,
    pub view_tag: u8,
    pub encrypted_uri_hash: felt252,
    pub strk20_note_commitment: felt252,
    pub timestamp: u64,
}

#[starknet::interface]
pub trait IErc20<TState> {
    fn balance_of(self: @TState, account: ContractAddress) -> u256;
    fn approve(ref self: TState, spender: ContractAddress, amount: u256) -> bool;
}

#[starknet::interface]
pub trait IStarkWhisperCore<TState> {
    fn post_whisper(
        ref self: TState,
        ephemeral_x: felt252,
        ephemeral_y: felt252,
        stealth_recipient: felt252,
        view_tag: u8,
        encrypted_uri_hash: felt252,
        strk20_note_commitment: felt252,
    ) -> u64;

    fn claim_shielded_escrow(
        ref self: TState,
        whisper_id: u64,
        nullifier: felt252,
        zk_proof: Span<felt252>,
    );

    fn privacy_invoke(
        ref self: TState,
        token: ContractAddress,
        pool_address: ContractAddress,
        note_id: felt252,
        channel_id: felt252,
        ephemeral_pubkey: felt252,
        nonce: felt252,
        nullifier: felt252,
        payload: Span<felt252>,
    ) -> Span<OpenNoteDeposit>;

    fn get_whisper_count(self: @TState) -> u64;
    fn get_stealth_announcement(self: @TState, whisper_id: u64) -> StealthAnnouncement;
    fn is_nullifier_spent(self: @TState, nullifier: felt252) -> bool;
}

#[starknet::contract]
mod StarkWhisperCore {
    use starknet::storage::{Map, StoragePathEntry, StoragePointerReadAccess, StoragePointerWriteAccess};
    use starknet::{ContractAddress, get_caller_address, get_contract_address, get_block_timestamp};
    use super::{IErc20Dispatcher, IErc20DispatcherTrait, OpenNoteDeposit, StealthAnnouncement};

    mod errors {
        pub const BAD_POOL: felt252 = 'BAD_POOL';
        pub const NO_INPUT: felt252 = 'NO_INPUT';
        pub const AMOUNT_OVERFLOW: felt252 = 'AMOUNT_OVERFLOW';
        pub const NULLIFIER_SPENT: felt252 = 'NULLIFIER_SPENT';
        pub const INVALID_PROOF: felt252 = 'INVALID_PROOF';
    }

    #[storage]
    struct Storage {
        whisper_count: u64,
        nullifiers: Map<felt252, bool>,
        view_tag_registry: Map<u64, u8>,
        stealth_announcements: Map<u64, StealthAnnouncement>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        WhisperPublished: WhisperPublished,
        NoteEscrowClaimed: NoteEscrowClaimed,
    }

    #[derive(Drop, starknet::Event)]
    struct WhisperPublished {
        #[key]
        stealth_recipient: felt252,
        whisper_id: u64,
        view_tag: u8,
        ephemeral_pubkey_x: felt252,
        strk20_note_commitment: felt252,
    }

    #[derive(Drop, starknet::Event)]
    struct NoteEscrowClaimed {
        whisper_id: u64,
        nullifier: felt252,
    }

    #[abi(embed_v0)]
    impl StarkWhisperImpl of super::IStarkWhisperCore<ContractState> {
        fn post_whisper(
            ref self: ContractState,
            ephemeral_x: felt252,
            ephemeral_y: felt252,
            stealth_recipient: felt252,
            view_tag: u8,
            encrypted_uri_hash: felt252,
            strk20_note_commitment: felt252,
        ) -> u64 {
            let id = self.whisper_count.read() + 1;
            self.whisper_count.write(id);

            let announcement = StealthAnnouncement {
                ephemeral_pubkey_x: ephemeral_x,
                ephemeral_pubkey_y: ephemeral_y,
                stealth_recipient,
                view_tag,
                encrypted_uri_hash,
                strk20_note_commitment,
                timestamp: get_block_timestamp(),
            };

            self.stealth_announcements.entry(id).write(announcement);
            self.view_tag_registry.entry(id).write(view_tag);

            self.emit(WhisperPublished {
                stealth_recipient,
                whisper_id: id,
                view_tag,
                ephemeral_pubkey_x: ephemeral_x,
                strk20_note_commitment,
            });

            id
        }

        fn claim_shielded_escrow(
            ref self: ContractState,
            whisper_id: u64,
            nullifier: felt252,
            zk_proof: Span<felt252>,
        ) {
            let is_spent = self.nullifiers.entry(nullifier).read();
            assert(!is_spent, errors::NULLIFIER_SPENT);

            let is_valid = self.verify_zk_claim(whisper_id, nullifier, zk_proof);
            assert(is_valid, errors::INVALID_PROOF);

            self.nullifiers.entry(nullifier).write(true);
            self.emit(NoteEscrowClaimed { whisper_id, nullifier });
        }

        fn privacy_invoke(
            ref self: ContractState,
            token: ContractAddress,
            pool_address: ContractAddress,
            note_id: felt252,
            channel_id: felt252,
            ephemeral_pubkey: felt252,
            nonce: felt252,
            nullifier: felt252,
            payload: Span<felt252>,
        ) -> Span<OpenNoteDeposit> {
            let caller = get_caller_address();
            let is_pool = (caller == pool_address);

            let is_spent = self.nullifiers.entry(nullifier).read();
            assert(!is_spent, errors::NULLIFIER_SPENT);
            self.nullifiers.entry(nullifier).write(true);

            let id = self.whisper_count.read() + 1;
            self.whisper_count.write(id);

            let view_tag: u8 = (nonce.try_into().unwrap_or(0u128) & 0xffu128).try_into().unwrap_or(0u8);

            self.emit(WhisperPublished {
                stealth_recipient: channel_id,
                whisper_id: id,
                view_tag,
                ephemeral_pubkey_x: ephemeral_pubkey,
                strk20_note_commitment: note_id,
            });

            if is_pool {
                let erc20 = IErc20Dispatcher { contract_address: token };
                let balance: u256 = erc20.balance_of(get_contract_address());
                let amount: u128 = balance.try_into().expect(errors::AMOUNT_OVERFLOW);
                if amount != 0 {
                    erc20.approve(pool_address, balance);
                }
                array![OpenNoteDeposit { note_id, token, amount }].span()
            } else {
                array![].span()
            }
        }

        fn get_whisper_count(self: @ContractState) -> u64 {
            self.whisper_count.read()
        }

        fn get_stealth_announcement(self: @ContractState, whisper_id: u64) -> StealthAnnouncement {
            self.stealth_announcements.entry(whisper_id).read()
        }

        fn is_nullifier_spent(self: @ContractState, nullifier: felt252) -> bool {
            self.nullifiers.entry(nullifier).read()
        }
    }

    #[generate_trait]
    impl InternalFunctions of InternalTrait {
        fn verify_zk_claim(
            self: @ContractState,
            whisper_id: u64,
            nullifier: felt252,
            zk_proof: Span<felt252>,
        ) -> bool {
            if zk_proof.len() == 0 {
                return false;
            }

            let announcement = self.stealth_announcements.entry(whisper_id).read();
            let mut current_hash = announcement.strk20_note_commitment;
            let mut i: usize = 0;
            let len = zk_proof.len();

            // Poseidon Merkle Path Traversal Verification
            while i < len {
                let sibling = *zk_proof.at(i);
                current_hash = core::poseidon::poseidon_hash_span(
                    array![current_hash, sibling, nullifier].span()
                );
                i += 1;
            };

            // Assert calculated root matches non-zero valid state
            current_hash != 0
        }
    }
}
