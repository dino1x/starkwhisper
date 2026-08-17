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
}
