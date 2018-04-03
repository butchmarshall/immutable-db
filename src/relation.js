import Immutable from 'immutable';

class Relation {
	constructor(orm, modelObj, instanceRow, toModelName) {
		this.orm = orm;
		this.modelObj = modelObj;
		this.instanceRow = instanceRow;
		this.toModelName = toModelName;

		this.modelName = modelObj.modelName+"_"+toModelName;
	}

	// Get all the associated objects
	all() {
		return this.orm.getRelation(this);
	}

	// Add a relationship to another instance
	add(instance) {
		this.orm.createRelation(this, instance);

		this.orm[this.toModelName].relations.forEach((relation) => {
			if (relation.belongsTo) {
				instance[relation.belongsTo] = this.instanceRow;
			}
		});
	}

	// Remove a relationship to another instance
	remove(instance) {
		this.orm.removeRelation(this, instance);
	}

	// Removes all relationships
	removeAll() {
		this.orm.removeAllRelations(this);
	}
}

export default Relation;