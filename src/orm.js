import Immutable from 'immutable';
import uuidv4 from 'uuid/v4';

const _uuid = new WeakMap();
const _store = new WeakMap();
const _modelRecord = new WeakMap();

class ModelStorage extends Immutable.Record({
	primaryKey: "id",
	byUUID: Immutable.Map(),
	byPrimaryKey: Immutable.Map(),
}, "ModelStorage") {
	getRowsByUUID(__uuids) {
		return this.byUUID.filter((v,k) => {
			return __uuids.includes(k);
		}).toList();
	}
	getRowByPrimaryKey(key) {
		return this.getRowByUUID(this.byPrimaryKey.get(key));
	}
	getRowByUUID(__uuid) {
		return this.byUUID.get(__uuid);
	}
	insertRow(row) {
		let byUUID = this.byUUID.set(_uuid.get(row), row),
		byPrimaryKey = this.byPrimaryKey.set(row[this.primaryKey], _uuid.get(row));

		let that = this.set("byUUID", byUUID);
		that = that.set("byPrimaryKey", byPrimaryKey);

		return that;
	}
	removeRow(row) {
		let byUUID = this.byUUID.remove(_uuid.get(row)),
		byPrimaryKey = this.byPrimaryKey.remove(row[this.primaryKey]);

		let that = this.set("byUUID", byUUID);
		that = that.set("byPrimaryKey", byPrimaryKey);

		return that;
	}
}

class ORM {
	constructor() {
		// Where the data goes
		_store.set(this, new Immutable.Map({}));
	}
	addModel(modelObj) {
		this[modelObj.modelName] = modelObj;
		modelObj.setORM(this);

		let store = _store.get(this);
		store = store.set(modelObj.modelName, new ModelStorage());

		modelObj.relations.forEach((relation) => {
			if (relation.hasMany) {
				store = store.set(modelObj.modelName+"_"+relation.hasMany, Immutable.Map({}));
			}
		});

		_store.set(this, store);
	}

	getRowByPrimaryKey(modelObj, id) {
		let store = _store.get(this);

		return store.get(modelObj.modelName).getRowByPrimaryKey(id);
	}

	updateRow(modelObj, row, data) {
		const __uuid = _uuid.get(row);
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
		_uuid.set(row, __uuid);

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

		let store = _store.get(this);

		let modelStorage = store.get(modelObj.modelName);
		modelStorage = modelStorage.insertRow(row);

		store = store.set(modelObj.modelName, modelStorage);
		_store.set(this, store);

		return row;
	}

	createRow(modelObj, data, __uuid = null) {
		const Record = _modelRecord.get(modelObj);
		const row = new Record(data);
		
		// UUID for each row is stored in weakmap, not on the object
		_uuid.set(row, __uuid || uuidv4());

		row.update = modelObj.update.bind(modelObj, row);

		modelObj.relations.forEach((relation) => {
			if (relation.hasMany) {
				row[relation.hasMany] = new Relation(this, modelObj, row, relation.hasMany);
			}
		});

		let store = _store.get(this),
		modelStorage = store.get(modelObj.modelName);
		modelStorage = modelStorage.insertRow(row);

		store = store.set(modelObj.modelName, modelStorage);
		_store.set(this, store);

		return row;
	}

	removeRow(modelObj, row) {
		let store = _store.get(this),
		modelStorage = store.get(modelObj.modelName);
		modelStorage = modelStorage.removeRow(row);
		store = store.set(modelObj.modelName, modelStorage);

		_store.set(this, store);

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
		let store = _store.get(this);

		let modelStorage = store.get(relationInstance.modelName);

		let map = modelStorage.get(_uuid.get(relationInstance.instanceRow)) || Immutable.List();
		map = map.push(_uuid.get(row));
		modelStorage = modelStorage.set(_uuid.get(relationInstance.instanceRow), map);
		store = store.set(relationInstance.modelName, modelStorage);

		_store.set(this, store);
	}

	removeRelation(relationInstance, row) {
		let store = _store.get(this);

		let modelStorage = store.get(relationInstance.modelName);

		let map = modelStorage.get(_uuid.get(relationInstance.instanceRow)) || Immutable.List();
		map = map.filter((__uuid) => {
			return __uuid !== _uuid.get(row);
		});
		modelStorage = modelStorage.set(_uuid.get(relationInstance.instanceRow), map);
		store = store.set(relationInstance.modelName, modelStorage);

		_store.set(this, store);
	}

	removeAllRelations(relationInstance) {
		let store = _store.get(this);

		let modelStorage = store.get(relationInstance.modelName);

		modelStorage = modelStorage.remove(_uuid.get(relationInstance.instanceRow));
		store = store.set(relationInstance.modelName, modelStorage);

		_store.set(this, store);
	}

	getRelation(relationInstance) {
		let store = _store.get(this);

		let relation = store.get(relationInstance.modelName);
		let list = relation.get(_uuid.get(relationInstance.instanceRow)) || Immutable.List();

		const objects = store.get(relationInstance.toModelName);

		const modelStorage = store.get(relationInstance.toModelName);

		return modelStorage.getRowsByUUID(list);
	}

	toJS() {
		return _store.get(this).toJS();
	}
}

export class Relation {
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

export class Model {
	constructor(modelName, schemaDef, relations = []) {
		// Immutable Record to use for this model
		_modelRecord.set(this,
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

export default ORM;