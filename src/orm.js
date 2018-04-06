import Immutable from 'immutable';
import uuidv4 from 'uuid/v4';

import ModelStorage from './model_storage';
import Relation from './relation';
import {
	ModelRecordMap
} from './model';

export const UUIDMap = new WeakMap();

const ORMStorage = new WeakMap();

class ORM {
	constructor() {
		// Where the data goes
		ORMStorage.set(this, new Immutable.Map({}));
	}

	getState() {
		return ORMStorage.get(this);
	}

	addModel(modelObj) {
		this[modelObj.modelName] = modelObj;
		modelObj.setORM(this);

		let store = ORMStorage.get(this);
		store = store.set(modelObj.modelName, new ModelStorage());

		modelObj.relations.forEach((relation) => {
			if (relation.hasMany) {
				store = store.set(modelObj.modelName+"_"+relation.hasMany, Immutable.Map({}));
			}
		});

		ORMStorage.set(this, store);
	}

	all(modelObj) {
		let store = ORMStorage.get(this);

		return store.get(modelObj.modelName).all();
	}

	getRowByPrimaryKey(modelObj, id) {
		let store = ORMStorage.get(this);

		return store.get(modelObj.modelName).getRowByPrimaryKey(id);
	}

	updateRow(modelObj, row, data) {
		const __uuid = UUIDMap.get(row);
		let methods = {};
		for(var k in modelObj.relations) {
			if (modelObj.relations[k].hasMany) {
				methods[modelObj.relations[k].hasMany] = row[modelObj.relations[k].hasMany];
			}
			if (modelObj.relations[k].belongsTo) {
				methods[modelObj.relations[k].belongsTo] = row[modelObj.relations[k].belongsTo];
			}
		}

		row = row.merge(data);
		row.update = modelObj.update.bind(modelObj, row);

		UUIDMap.set(row, __uuid);

		for(var k in methods) {
			row[k] = methods[k];
		}

		for(var k in modelObj.relations) {
			// Dirty dirty update of the belongsTo relationships for each assoication
			if (modelObj.relations[k].hasMany) {
				row[modelObj.relations[k].hasMany].all().forEach((obj) => {
					this[obj.constructor.getModelName()].relations.forEach((relation) => {
						if (relation.belongsTo) {
							obj[relation.belongsTo] = row;
						}
					});
				});
			}
			// I don't think we need to deal with the belongs to case, no ref here?
			if (modelObj.relations[k].belongsTo) {
			}
		}

		let store = ORMStorage.get(this);

		let modelStorage = store.get(modelObj.modelName);
		modelStorage = modelStorage.insertRow(row);

		store = store.set(modelObj.modelName, modelStorage);
		ORMStorage.set(this, store);

		return row;
	}

	createRow(modelObj, data, __uuid = null) {
		const Record = ModelRecordMap.get(modelObj);
		const row = new Record(data);
		
		// UUID for each row is stored in weakmap, not on the object
		UUIDMap.set(row, __uuid || uuidv4());

		row.update = modelObj.update.bind(modelObj, row);

		modelObj.relations.forEach((relation) => {
			if (relation.hasMany) {
				row[relation.hasMany] = new Relation(this, modelObj, row, relation.hasMany);
			}
		});

		let store = ORMStorage.get(this),
		modelStorage = store.get(modelObj.modelName);
		modelStorage = modelStorage.insertRow(row);

		store = store.set(modelObj.modelName, modelStorage);
		ORMStorage.set(this, store);

		return row;
	}

	removeRow(modelObj, row) {
		let store = ORMStorage.get(this),
		modelStorage = store.get(modelObj.modelName);
		modelStorage = modelStorage.removeRow(row);
		store = store.set(modelObj.modelName, modelStorage);

		ORMStorage.set(this, store);

		// Clean up relations
		modelObj.relations.forEach((relation) => {
			if (relation.hasMany) {
				row[relation.hasMany].removeAll();
			}
			if (relation.belongsTo) {
				this.removeRelation(row[relation.belongsTo], row);
			}
		});
	}

	createRelation(relationInstance, row) {
		let store = ORMStorage.get(this);

		let modelStorage = store.get(relationInstance.modelName);

		let map = modelStorage.get(UUIDMap.get(relationInstance.instanceRow)) || Immutable.List();
		map = map.push(UUIDMap.get(row));
		modelStorage = modelStorage.set(UUIDMap.get(relationInstance.instanceRow), map);
		store = store.set(relationInstance.modelName, modelStorage);

		ORMStorage.set(this, store);
	}

	removeRelation(relationInstance, row) {
		let store = ORMStorage.get(this);

		let modelStorage = store.get(relationInstance.modelName);

		let map = modelStorage.get(UUIDMap.get(relationInstance.instanceRow)) || Immutable.List();
		map = map.filter((__uuid) => {
			return __uuid !== UUIDMap.get(row);
		});
		modelStorage = modelStorage.set(UUIDMap.get(relationInstance.instanceRow), map);
		store = store.set(relationInstance.modelName, modelStorage);

		relationInstance.orm[relationInstance.toModelName].relations.forEach((relation) => {
			if (relation.belongsTo) {
				row[relation.belongsTo] = undefined;
			}
		});
		
		ORMStorage.set(this, store);
	}

	removeAllRelations(relationInstance) {
		let store = ORMStorage.get(this);

		let modelStorage = store.get(relationInstance.modelName);

		// Remove references belongsTo assoications
		relationInstance.all().forEach((obj) => {
			relationInstance.orm[relationInstance.toModelName].relations.forEach((relation) => {
				if (relation.belongsTo) {
					obj[relation.belongsTo] = undefined;
				}
			});
		});

		modelStorage = modelStorage.remove(UUIDMap.get(relationInstance.instanceRow));
		store = store.set(relationInstance.modelName, modelStorage);

		ORMStorage.set(this, store);
	}

	getRelation(relationInstance) {
		let store = ORMStorage.get(this);

		let relation = store.get(relationInstance.modelName);
		let list = relation.get(UUIDMap.get(relationInstance.instanceRow)) || Immutable.List();

		const objects = store.get(relationInstance.toModelName);

		const modelStorage = store.get(relationInstance.toModelName);

		return modelStorage.getRowsByUUID(list);
	}

	toJS() {
		return ORMStorage.get(this).toJS();
	}
}


export default ORM;