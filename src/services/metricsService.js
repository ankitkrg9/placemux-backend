const counters = {};

const increment = (key, by = 1) => {
    counters[key] = (counters[key] || 0) + by;
};

const snapshot = () => ({ ...counters });

module.exports = { increment, snapshot };
