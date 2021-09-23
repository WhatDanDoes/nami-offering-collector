module.exports = function(mongoose) {
  const Schema = mongoose.Schema;

  const AgentSchema = new Schema({
  }, {
    timestamps: true,
    strict: false
  });

  return AgentSchema;
}
