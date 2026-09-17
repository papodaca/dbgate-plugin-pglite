const { SqlDumper } = (global.DBGATE_PACKAGES && global.DBGATE_PACKAGES['dbgate-tools']) || require('dbgate-tools');

class Dumper extends SqlDumper {
  autoIncrement() {}

  renameSqlObject(obj, newname) {
    this.putCmd('^alter %k %f ^rename ^to %i', this.getSqlObjectSqlName(obj.objectTypeField), obj, newname);
  }

  renameTable(obj, newname) {
    this.putCmd('^alter ^table %f ^rename ^to %i', obj, newname);
  }

  renameColumn(column, newcol) {
    this.putCmd('^alter ^table %f ^rename ^column %i ^to %i', column, column.columnName, newcol);
  }
}

module.exports = Dumper;
