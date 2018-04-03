import Immutable from 'immutable';

export const ModelRecordMap = new WeakMap();

class Model {
	constructor(modelName, schemaDef, relations = []) {
		// Immutable Record to use for this model
		ModelRecordMap.set(this,
			class ModelRecord extends Immutable.Record(
				schemaDef.reduce(
					(accum, item) => {
						accum[item] = undefined;
						return accum;
					},
					{}
				), modelName) {
				static getModelName() {
					return modelName;
				}
			}
		);

		this.modelName = modelName;
		this.relations = relations;
		this.orm = null;
	}

	setORM(orm) {
		if (this.orm !== null) {
			throw Error("cannot set two orms");
		}
		this.orm = orm;
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