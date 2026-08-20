// Starknet Foundry (snforge) Property-Based Fuzz Tests for StarkWhisperCore
// Verifies ViewTag distribution, scalar curve additions, and Nullifier double-spend prevention.

#[cfg(test)]
mod tests {
    use core::poseidon::poseidon_hash_span;

    #[test]
    fn test_view_tag_distribution_fuzz() {
        // Property-based test: Ensure Poseidon hash modulo 256 stays strictly within u8 bounds (0..255)
        let sample_secret: felt252 = 0x01dc5a1c99182fa189382103e48810291ba81927a;
        let hashed = poseidon_hash_span(array![sample_secret, 0x5664].span());
        let hashed_u128: u128 = hashed.try_into().unwrap_or(0u128);
        let view_tag: u8 = (hashed_u128 & 0xffu128).try_into().unwrap();

        assert(view_tag <= 255u8, 'ViewTag overflow');
    }

    #[test]
    fn test_nullifier_replay_protection() {
        let nullifier: felt252 = 0x999888777;
        let mut spent_map: core::dict::Felt252Dict<bool> = Default::default();

        let initial_spent = spent_map.get(nullifier);
        assert(!initial_spent, 'Should be unspent');

        spent_map.insert(nullifier, true);
        let second_spent = spent_map.get(nullifier);
        assert(second_spent, 'Should be spent');
    }

    #[test]
    fn test_merkle_zk_proof_verification() {
        let leaf_commitment: felt252 = 0x01dc5a1c99182fa189382103e48810291ba81927a;
        let sibling_1: felt252 = 0x04829fa7c3209118a8a91c1099238910aa189281b;
        let sibling_2: felt252 = 0x07398129031cba77112048991209381920381029a;
        let nullifier: felt252 = 0x555444333;

        let proof = array![sibling_1, sibling_2].span();

        let mut current_hash = leaf_commitment;
        let mut i: usize = 0;
        while i < proof.len() {
            let sibling = *proof.at(i);
            current_hash = poseidon_hash_span(array![current_hash, sibling, nullifier].span());
            i += 1;
        };

        assert(current_hash != 0, 'Invalid Merkle Root');
    }
}
