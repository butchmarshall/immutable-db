import Immutable from 'immutable';

export const ModelRecordMap = new WeakMap();

class Model {
	constructor(modelName, schemaDef, relations = {}) {
		// Immutable Record to use for this model
		ModelRecordMap.set(this,
			class ModelRecord extends Immutable.Record(
				((schemaDef instanceof Array)? schemaDef.reduce(
					(accum, item) => {
						accum[item] = undefined;
						return accum;
					},
					{}
				) : schemaDef), modelName) {
				static getModelName() {
					return modelName;
				}
			}
		);

		this.primaryKey = relations.primaryKey || "id";
		this.modelName = modelName;
		// Ensure all values are an array
		this.relations = Object.keys(relations).reduce((obj, k, v) => {
			obj[k] = ((Array.isArray(relations[k]))? relations[k] : [relations[k]]);
			return obj;
		}, {});

		this.orm = null;
	}

	setORM(orm) {
		if (this.orm !== null) {
			throw Error("cannot set two orms");
		}
		this.orm = orm;
	}

	all() {
		return this.orm.all(this);
	}

	getRowByPrimaryKey(key) {
		return this.orm.getRowByPrimaryKey(this, key);
	}

	create(data) {
		return this.orm.createRow(this, data);
	}
	remove(row) {
		return this.orm.removeRow(this, row);
	}
	
	update(row, data) {
		return this.orm.updateRow(this, row, data);
	}
}

export default Model;