const randomHex = () => {
  const S = 'abcdefABCDEF0123456789';
  const N = 41;
  return Array.from(Array(N))
    .map(() => S[Math.floor(Math.random() * S.length)])
    .join('');
};

module.exports = randomHex;
