class ModuleFactory {

    modules = {}
    getModuleByName(name){
        return this.modules[name];
    }

}

module.exports = new ModuleFactory();